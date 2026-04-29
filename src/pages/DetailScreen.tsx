import Card from '@/components/common/Card';
import { useDomainCheckIns } from '@/hooks/useCheckIns';
import { useStreaks } from '@/hooks/useStreaks';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { type CheckInStatus, DOMAINS, type DailyCheckIn, type DomainType } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_DOT: Record<string, string> = {
  Done: 'bg-status-done',
  Partial: 'bg-status-partial',
  Missed: 'bg-status-missed',
  Pending: 'bg-base-border',
};

const STATUS_LABEL: Record<string, string> = {
  Done: 'Done',
  Partial: 'Partial',
  Missed: 'Missed',
  Pending: 'Pending',
  Protected: 'Protected',
};

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86_400_000).toISOString().split('T')[0]);
  }
  return days;
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
}

function NoteRow({ checkIn, cycleId, profileId, domainType, limit }: NoteRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(checkIn.notes ?? '');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  async function save() {
    if (draft === (checkIn.notes ?? '')) {
      setExpanded(false);
      return;
    }
    setSaving(true);
    await supabase
      .from('daily_check_ins')
      .update({ notes: draft || null })
      .eq('id', checkIn.id);
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
          {checkIn.notes && (
            <span className="text-base-muted text-xs italic truncate max-w-[120px]">
              - {checkIn.notes}
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
            className="input-field w-full h-16 resize-none text-xs mb-2"
            placeholder="Add a note for this day..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            // biome-ignore lint/a11y/noAutofocus: inline editor should grab focus on expand
            autoFocus
          />
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
                setDraft(checkIn.notes ?? '');
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
    currentCycle,
    domainFocuses,
    streaks: localStreaks,
    todayCheckIns,
    checkInHistory,
  } = useAppStore();

  const today = new Date().toISOString().split('T')[0];
  const domainType = domain?.toUpperCase() as DomainType;
  const domainConfig = DOMAINS.find((d) => d.type === domainType);
  const focus = domainFocuses.find((f) => f.domainType === domainType);

  const { data: remoteStreaks } = useStreaks();
  const HISTORY_LIMIT = 28;
  const { data: history } = useDomainCheckIns(domainType, HISTORY_LIMIT);

  const streak =
    profile?.tier === 'brotherhood'
      ? remoteStreaks?.find((s) => s.domainType === domainType)
      : localStreaks[domainType];

  if (!domainConfig) {
    return (
      <div className="px-4 pt-6">
        <p className="text-base-subtext">Domain not found.</p>
      </div>
    );
  }

  // Build sparkline data for Brotherhood (28 days oldest → newest)
  const sparklineData: SparkStatus[] = (() => {
    if (profile?.tier !== 'brotherhood' || !history) return [];
    const days: string[] = [];
    for (let i = HISTORY_LIMIT - 1; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 86_400_000).toISOString().split('T')[0]);
    }
    const byDate = new Map(history.map((c) => [c.date, c.status]));
    return days.map((d) => (d === today ? todayCheckIns[domainType]?.status : byDate.get(d)));
  })();

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
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
        {domainConfig.label}
      </h1>

      {focus && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
            This cycle's focus
          </p>
          <p className="text-base-text">{focus.focusDescription}</p>
        </Card>
      )}

      {/* Streak */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
          Current streak
        </p>
        <p className="font-heading text-3xl font-bold text-base-text">
          {streak?.currentStreak ?? 0}
          <span className="text-base-subtext text-base font-normal ml-1">days</span>
        </p>
        <p className="text-base-subtext text-xs mt-1">Longest: {streak?.longestStreak ?? 0} days</p>
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
            {todayCheckIns[domainType]?.status ?? 'Not checked in'}
          </span>
        </div>
      </Card>

      {/* Brotherhood: sparkline + notes history */}
      {profile?.tier === 'brotherhood' && (
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
                  Partial
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
                />
              ))}
            </div>
          ) : (
            <p className="text-base-muted text-sm">No check-in history yet.</p>
          )}
        </Card>
      )}

      {/* Free tier: 7-day list */}
      {profile?.tier === 'free' && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">
            Last 7 days
          </p>
          <div className="flex flex-col gap-1.5">
            {getLast7Days().map((date) => {
              const status: CheckInStatus | undefined =
                date === today
                  ? (todayCheckIns[domainType]?.status ?? undefined)
                  : (checkInHistory[date]?.[domainType] ?? undefined);
              const dotClass = status
                ? (STATUS_DOT[status] ?? 'bg-base-border')
                : 'bg-base-border/40';
              const d = new Date(`${date}T00:00:00`);
              const dayLabel = d.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
              return (
                <div key={date} className="flex items-center justify-between">
                  <span className="text-base-subtext text-xs">{dayLabel}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                    <span className="text-base-muted text-xs">
                      {status ? STATUS_LABEL[status] : 'No data'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-base-muted text-xs mt-3 border-t border-base-border pt-2">
            Upgrade to Brotherhood for your full 28-day history, sparkline trends, and per-day
            notes.
          </p>
        </Card>
      )}
    </div>
  );
}
