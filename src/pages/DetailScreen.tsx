import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import SetupOptionSections from '@/components/common/SetupOptionSections';
import { useDomainCheckIns } from '@/hooks/useCheckIns';
import { useStreaks } from '@/hooks/useStreaks';
import { useAppStore } from '@/store/useAppStore';
import {
  type CheckInStatus,
  type DailyCheckIn,
  type DomainType,
  getDomainConfig,
  getDomainRouteSlug,
  getDomainTypeFromRouteSlug,
} from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import {
  CONNECTION_RECIPIENT_OPTIONS,
  CONNECTION_SUPPORT_OPTIONS,
  type ConnectionContextId,
  type ConnectionRecipientId,
  buildConnectionFocusDescription,
  buildDomainSetupOptionModel,
  buildHealthPatternReflection,
  getConnectionContextOptions,
  getDailyDomainLabel,
  toLocalIsoDate,
} from '@/utils/v1Framework';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_DOT: Record<string, string> = {
  Done: 'bg-status-done',
  Partial: 'bg-status-partial',
  Missed: 'bg-status-missed',
  Pending: 'bg-base-border',
};

const STATUS_LABEL: Record<string, string> = {
  Done: 'Done',
  Partial: 'Part done',
  Missed: 'Missed',
  Pending: 'Pending',
  Protected: 'Protected',
};

function dayUnit(count: number): 'day' | 'days' {
  return count === 1 ? 'day' : 'days';
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────

type SparkStatus = CheckInStatus | undefined;

interface SparklineProps {
  data: SparkStatus[];
}

function Sparkline({ data }: SparklineProps) {
  const BAR_W = 6;
  const GAP = 3;
  const H = 28;

  return (
    <svg
      viewBox={`0 0 ${data.length * (BAR_W + GAP)} ${H}`}
      className="w-full"
      aria-hidden="true"
      style={{ height: H }}
    >
      {data.map((status, i) => {
        if (!status || status === 'Pending' || status === 'Protected') return null;
        const x = i * (BAR_W + GAP);
        const barH = status === 'Done' ? H : status === 'Partial' ? H / 2 : 3;
        const y = H - barH;
        const fill = status === 'Done' ? '#4ade80' : status === 'Partial' ? '#f59e0b' : '#ef4444';
        return (
          <rect key={`${i}-${status}`} x={x} y={y} width={BAR_W} height={barH} fill={fill} rx={1} />
        );
      })}
    </svg>
  );
}

// ─── Inline note editor ───────────────────────────────────────────────────────

interface NoteRowProps {
  checkIn: DailyCheckIn;
  cycleId: string;
  profileId: string;
  domainType: DomainType;
  limit: number;
  noteOverride?: string | null;
  onSaveNote: (checkIn: DailyCheckIn, notes: string) => Promise<void>;
}

function NoteRow({
  checkIn,
  cycleId,
  profileId,
  domainType,
  limit,
  noteOverride,
  onSaveNote,
}: NoteRowProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleNote = noteOverride !== undefined ? noteOverride : checkIn.notes;
  const [draft, setDraft] = useState(visibleNote ?? '');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Sync draft when the saved note changes externally (e.g. after query invalidation),
  // but only while the editor is closed to avoid clobbering in-progress typing.
  useEffect(() => {
    if (!expanded) setDraft(visibleNote ?? '');
  }, [visibleNote, expanded]);

  async function save() {
    if (draft === (visibleNote ?? '')) {
      setExpanded(false);
      return;
    }
    setSaving(true);
    await onSaveNote(checkIn, draft);
    setSaving(false);
    setExpanded(false);
    queryClient.invalidateQueries({
      queryKey: ['check-ins', profileId, cycleId, domainType, limit],
    });
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between py-1.5 group"
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[checkIn.status] ?? 'bg-base-border'}`}
          />
          <span className="text-base-subtext text-xs">{checkIn.date}</span>
          {visibleNote && (
            <span className="text-base-muted text-xs italic truncate max-w-[120px]">
              - {visibleNote}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base-muted text-xs">{STATUS_LABEL[checkIn.status]}</span>
          <span className="text-base-border group-hover:text-base-subtext text-xs transition-colors">
            {expanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="ml-3 mb-2">
          <textarea
            className="input-field w-full h-16 resize-none text-xs mb-1"
            placeholder="Add a note for this day..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            // biome-ignore lint/a11y/noAutofocus: inline editor should grab focus on expand
            autoFocus
          />
          <p
            className={`text-xs mb-2 text-right ${draft.length > 450 ? 'text-status-missed' : 'text-base-muted'}`}
          >
            {draft.length}/500
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-accent-green text-xs font-medium hover:opacity-80 transition-opacity"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(visibleNote ?? '');
                setExpanded(false);
              }}
              className="text-base-muted text-xs hover:text-base-subtext transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DetailScreen() {
  const navigate = useNavigate();
  const { domain } = useParams<{ domain: string }>();
  const {
    profile,
    authUser,
    currentCycle,
    domainFocuses,
    updateDomainFocus,
    streaks: localStreaks,
    todayCheckIns,
    checkInNoteOverrides,
    updateDailyCheckInNote,
  } = useAppStore();

  const today = toLocalIsoDate(new Date());
  const domainType = getDomainTypeFromRouteSlug(domain);
  const queryDomainType = domainType ?? 'BODY';
  const domainConfig = domainType ? getDomainConfig(domainType, authUser?.email) : undefined;
  const focus = domainType ? domainFocuses.find((f) => f.domainType === domainType) : undefined;
  const displayLabel = domainConfig ? getDailyDomainLabel(domainConfig) : '';
  const setupOptions = domainConfig ? buildDomainSetupOptionModel(domainConfig) : null;
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusDraft, setFocusDraft] = useState('');
  const [focusSaving, setFocusSaving] = useState(false);
  const [connectionRecipient, setConnectionRecipient] = useState<ConnectionRecipientId>('partner');
  const [connectionContext, setConnectionContext] = useState<ConnectionContextId>('practical_help');

  const { data: remoteStreaks } = useStreaks();
  const HISTORY_LIMIT = 28;
  const { data: history } = useDomainCheckIns(queryDomainType, HISTORY_LIMIT);

  const streak =
    remoteStreaks?.find((s) => s.domainType === domainType) ??
    (domainType ? localStreaks[domainType] : undefined);
  const connectionContextOptions = getConnectionContextOptions(connectionRecipient);
  const healthPatternReflection =
    domainType && (domainType === 'BODY' || domainType === 'FUEL')
      ? buildHealthPatternReflection(domainType, [
          ...(history?.map((checkIn) => checkInNoteOverrides[checkIn.id]?.notes ?? checkIn.notes) ??
            []),
          todayCheckIns[domainType]?.notes,
        ])
      : null;

  function selectConnectionRecipient(nextRecipient: ConnectionRecipientId) {
    const nextContextOptions = getConnectionContextOptions(nextRecipient);
    const nextContext = nextContextOptions.some((option) => option.id === connectionContext)
      ? connectionContext
      : nextContextOptions[0].id;

    setConnectionRecipient(nextRecipient);
    setConnectionContext(nextContext);
    setFocusDraft(buildConnectionFocusDescription(nextRecipient, nextContext));
  }

  function selectConnectionContext(nextContext: ConnectionContextId) {
    setConnectionContext(nextContext);
    setFocusDraft(buildConnectionFocusDescription(connectionRecipient, nextContext));
  }

  useEffect(() => {
    if (!domainType) return;
    const canonicalSlug = getDomainRouteSlug(domainType);
    if (domain?.trim().toLowerCase() === canonicalSlug) return;
    navigate(`/detail/${canonicalSlug}`, { replace: true });
  }, [domain, domainType, navigate]);

  if (!domainType || !domainConfig) {
    return (
      <div className="px-4 pt-6">
        <p className="text-base-subtext">Domain not found.</p>
      </div>
    );
  }

  // Build sparkline data for 28 days oldest to newest.
  const sparklineData: SparkStatus[] = (() => {
    if (!hasBrotherhoodAccess(profile?.tier) || !history) return [];
    const days: string[] = [];
    for (let i = HISTORY_LIMIT - 1; i >= 0; i--) {
      days.push(toLocalIsoDate(new Date(Date.now() - i * 86_400_000)));
    }
    const byDate = new Map(history.map((c) => [c.date, c.status]));
    return days.map((d) => (d === today ? todayCheckIns[domainType]?.status : byDate.get(d)));
  })();
  const todayStatus = todayCheckIns[domainType]?.status;
  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="flex items-center gap-1.5 text-base-subtext hover:text-base-text text-sm -mb-1 transition-colors"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back
      </button>
      <h1 className={`font-heading text-2xl font-bold tracking-wide ${domainConfig.colour}`}>
        {displayLabel}
      </h1>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
              Current focus
            </p>
            <p className="text-base-text text-sm">
              {focus?.focusDescription ?? 'No focus set yet.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFocusDraft(
                focus?.focusDescription ??
                  (domainType === 'USTIME'
                    ? buildConnectionFocusDescription(connectionRecipient, connectionContext)
                    : (setupOptions?.focusOptions[0] ?? domainConfig.focusOptions[0])),
              );
              setEditingFocus((value) => !value);
            }}
            className="shrink-0"
          >
            {focus ? 'Edit' : 'Set'}
          </Button>
        </div>
        {editingFocus && (
          <div className="mt-4 border-t border-base-border pt-4">
            {domainType === 'USTIME' && (
              <div className="mb-4 flex flex-col gap-3">
                <div>
                  <p className="mb-2 font-heading text-[11px] uppercase tracking-widest text-base-muted">
                    Who is this for?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CONNECTION_RECIPIENT_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        aria-pressed={connectionRecipient === option.id}
                        onClick={() => selectConnectionRecipient(option.id)}
                        className={`min-h-11 rounded border px-3 py-2 text-left text-sm transition-colors ${
                          connectionRecipient === option.id
                            ? 'border-accent-green bg-accent-green/10 text-base-text'
                            : 'border-base-border bg-base-black/20 text-base-subtext hover:border-base-muted'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-heading text-[11px] uppercase tracking-widest text-base-muted">
                    What helps today?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {connectionContextOptions.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        aria-pressed={connectionContext === option.id}
                        onClick={() => selectConnectionContext(option.id)}
                        className={`min-h-11 rounded border px-3 py-2 text-left text-sm transition-colors ${
                          connectionContext === option.id
                            ? 'border-accent-green bg-accent-green/10 text-base-text'
                            : 'border-base-border bg-base-black/20 text-base-subtext hover:border-base-muted'
                        }`}
                      >
                        <span className="block text-base-text">{option.label}</span>
                        <span className="mt-1 block text-xs text-base-muted">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {setupOptions && (
              <div className="mb-3">
                <SetupOptionSections
                  model={setupOptions}
                  value={focusDraft}
                  onSelect={setFocusDraft}
                />
              </div>
            )}
            <textarea
              className="input-field h-20 resize-none text-sm mb-3"
              placeholder={domainConfig.focusPrompt}
              value={focusDraft}
              onChange={(e) => setFocusDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  setFocusSaving(true);
                  await updateDomainFocus(domainType, focusDraft);
                  setFocusSaving(false);
                  setEditingFocus(false);
                }}
                disabled={!focusDraft.trim() || focusSaving}
                className="flex-1"
              >
                {focusSaving ? 'Saving...' : 'Save focus'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingFocus(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Useful ideas
        </p>
        <p className="text-base-text text-sm mb-3">{domainConfig.question}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-base-border p-2">
            <p className="font-heading text-[11px] text-base-muted uppercase tracking-widest">
              Get ready
            </p>
            <p className="text-base-subtext text-xs mt-1">{domainConfig.prepOptions[0]}</p>
          </div>
          <div className="rounded border border-base-border p-2">
            <p className="font-heading text-[11px] text-base-muted uppercase tracking-widest">
              Keep it easy
            </p>
            <p className="text-base-subtext text-xs mt-1">{domainConfig.coachPrompt}</p>
          </div>
          <div className="rounded border border-base-border p-2">
            <p className="font-heading text-[11px] text-base-muted uppercase tracking-widest">
              Ask yourself
            </p>
            <p className="text-base-subtext text-xs mt-1">{domainConfig.reflectPrompt}</p>
          </div>
          <div className="rounded border border-base-border p-2">
            <p className="font-heading text-[11px] text-base-muted uppercase tracking-widest">
              Good to know
            </p>
            <p className="text-base-subtext text-xs mt-1">{domainConfig.feedbackPrompt}</p>
          </div>
        </div>
      </Card>

      {domainType === 'USTIME' && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Connection modes
          </p>
          <div className="flex flex-col gap-2">
            {CONNECTION_SUPPORT_OPTIONS.map((option) => (
              <p key={option} className="text-base-subtext text-xs">
                {option}
              </p>
            ))}
          </div>
        </Card>
      )}

      {healthPatternReflection && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Guardrail
          </p>
          <p className="text-base-subtext text-sm">{healthPatternReflection}</p>
        </Card>
      )}

      {/* Streak */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
          Current streak
        </p>
        <p className="font-heading text-3xl font-bold text-base-text">
          {currentStreak}
          <span className="text-base-subtext text-base font-normal ml-1">
            {dayUnit(currentStreak)}
          </span>
        </p>
        <p className="text-base-subtext text-xs mt-1">
          Longest: {longestStreak} {dayUnit(longestStreak)}
        </p>
        {streak?.lastCheckInDate && (
          <p className="text-base-muted text-xs mt-0.5">Last check-in: {streak.lastCheckInDate}</p>
        )}
      </Card>

      {/* Today */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Today
        </p>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[todayCheckIns[domainType]?.status ?? 'Pending'] ?? 'bg-base-border'}`}
          />
          <span className="text-base-text text-sm">
            {todayStatus ? STATUS_LABEL[todayStatus] : 'Not checked in'}
          </span>
        </div>
      </Card>

      {/* Full history */}
      {profile && hasBrotherhoodAccess(profile.tier) && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">
            Last 28 days
          </p>

          {/* Sparkline */}
          {sparklineData.length > 0 && (
            <div className="mb-4">
              <Sparkline data={sparklineData} />
              <div className="flex gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-base-muted">
                  <span className="w-2 h-2 rounded-sm bg-status-done inline-block" />
                  Done
                </span>
                <span className="flex items-center gap-1 text-xs text-base-muted">
                  <span className="w-2 h-2 rounded-sm bg-status-partial inline-block" />
                  Part done
                </span>
                <span className="flex items-center gap-1 text-xs text-base-muted">
                  <span className="w-2 h-2 rounded-sm bg-status-missed inline-block" />
                  Missed
                </span>
              </div>
            </div>
          )}

          {/* Notes history */}
          {history && history.length > 0 ? (
            <div className="flex flex-col divide-y divide-base-border/40">
              {history.map((checkIn) => (
                <NoteRow
                  key={checkIn.id}
                  checkIn={checkIn}
                  cycleId={currentCycle?.id ?? ''}
                  profileId={profile.id}
                  domainType={domainType}
                  limit={HISTORY_LIMIT}
                  noteOverride={checkInNoteOverrides[checkIn.id]?.notes}
                  onSaveNote={updateDailyCheckInNote}
                />
              ))}
            </div>
          ) : (
            <p className="text-base-muted text-sm">No check-in history yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}
