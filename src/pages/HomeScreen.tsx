import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DismissibleTip from '@/components/common/DismissibleTip';
import CheckInStatusModal from '@/components/modals/CheckInStatusModal';
import Day84CompletionModal from '@/components/modals/Day84CompletionModal';
import ProgressiveDomainSetupModal from '@/components/modals/ProgressiveDomainSetupModal';
import WeeklyVibeCheckModal from '@/components/modals/WeeklyVibeCheckModal';
import { isSquadFeatureEnabled } from '@/config/features';
import { useNudge } from '@/hooks/useNudge';
import { useSquadMembers, useSquadPulse } from '@/hooks/useSquad';
import { useAppStore } from '@/store/useAppStore';
import {
  type CheckInStatus,
  type DomainType,
  IDENTITY_ANCHORS,
  KAIROS_CYCLE_LENGTH_DAYS,
  KAIROS_PHASES,
  PRODUCT_POSITIONING,
  getAvailableDomains,
  getDomainRouteSlug,
} from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import {
  getCurrentPhaseConfig,
  getCycleProgressPct,
  getDayInCycle,
  getPhaseProgressPct,
} from '@/utils/kairos';
import {
  type DayStateProtocol,
  type DayStateProtocolAction,
  getDailyDomainLabel,
  selectDayStateProtocol,
  toLocalIsoDate,
} from '@/utils/v1Framework';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS: Record<CheckInStatus, string> = {
  Done: 'Done',
  Partial: 'Part done',
  Missed: 'Missed',
  Pending: 'Check in',
  Protected: 'Rest day',
};

const STATUS_ROW_CLASSES: Record<CheckInStatus, string> = {
  Done: 'border-white/10 bg-base-surface/90 hover:border-status-done/35',
  Partial: 'border-white/10 bg-base-surface/90 hover:border-status-partial/35',
  Missed: 'border-white/10 bg-base-surface/90 hover:border-status-missed/35',
  Pending: 'border-white/10 bg-base-surface/90 hover:border-white/20',
  Protected: 'border-white/10 bg-base-surface/90 hover:border-base-muted/40',
};

const STATUS_BADGE_CLASSES: Record<CheckInStatus, string> = {
  Done: 'border-status-done/40 bg-status-done/5 text-status-done',
  Partial: 'border-status-partial/40 bg-status-partial/5 text-status-partial',
  Missed: 'border-status-missed/40 bg-status-missed/5 text-status-missed',
  Pending: 'border-white/15 bg-white/[0.03] text-base-subtext',
  Protected: 'border-base-muted/40 bg-base-muted/5 text-base-muted',
};

function shouldShowVibeCheck(lastVibeCheckDate: string | null, dayInCycle: number): boolean {
  if (dayInCycle < 7) return false;
  if (!lastVibeCheckDate) return true;
  const last = new Date(lastVibeCheckDate);
  const today = new Date();
  const daysSince = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
  return daysSince >= 7;
}

const PHASE_MILESTONE_MESSAGES: Record<string, string> = {
  ANCHOR: 'The start is real. Now make it easier to repeat.',
  INCREASE: 'The floor is set. Add load carefully.',
  RHYTHM: 'Patterns matter now. Make the week predictable.',
  OWN: 'Remove friction. Make the action yours.',
  SUSTAIN: 'Hold the gain. Prepare the next cycle deliberately.',
};

const DAY_PROTOCOL_DISMISSAL_KEY = 'kairos_day_protocol_dismissal_v1';
const KAIROS_EXPLAINER_DISMISSED_KEY_PREFIX = 'kairos_explainer_dismissed_v1';
const CORE_CATEGORY_LABELS = ['Body', 'Fuel', 'Self', 'Connection'] as const;

interface DismissedDayProtocol {
  cycleId: string | null;
  date: string;
  protocolId: string;
  targetKey: string | null;
  dismissedAt: string;
}

function getProtocolTargetKey(protocol: DayStateProtocol | null | undefined): string | null {
  const target = protocol?.target;
  if (!target) return null;
  return target.kind === 'domain' ? `domain:${target.domainType}` : `route:${target.routeId}`;
}

function readDismissedDayProtocol(todayIso: string): DismissedDayProtocol | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DAY_PROTOCOL_DISMISSAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DismissedDayProtocol>;
    if (!parsed.dismissedAt || parsed.date !== todayIso) {
      window.localStorage.removeItem(DAY_PROTOCOL_DISMISSAL_KEY);
      return null;
    }
    return {
      cycleId: parsed.cycleId ?? null,
      date: parsed.date,
      protocolId: parsed.protocolId ?? '',
      targetKey: parsed.targetKey ?? null,
      dismissedAt: parsed.dismissedAt,
    };
  } catch {
    window.localStorage.removeItem(DAY_PROTOCOL_DISMISSAL_KEY);
    return null;
  }
}

function writeDismissedDayProtocol(dismissal: DismissedDayProtocol): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DAY_PROTOCOL_DISMISSAL_KEY, JSON.stringify(dismissal));
}

function getKairosExplainerDismissedKey(profileId: string): string {
  return `${KAIROS_EXPLAINER_DISMISSED_KEY_PREFIX}:${profileId}`;
}

function readKairosExplainerDismissed(profileId: string | null | undefined): boolean {
  if (!profileId || typeof window === 'undefined') return true;
  return window.localStorage.getItem(getKairosExplainerDismissedKey(profileId)) === '1';
}

function writeKairosExplainerDismissed(profileId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getKairosExplainerDismissedKey(profileId), '1');
}

// Module-level flags: prevent re-prompting within the same JS session even if HomeScreen remounts.
let vibeCheckShownThisSession = false;
let domainSetupShownThisSession = false;
let phaseTransitionShownThisSession = false;

export default function HomeScreen() {
  const navigate = useNavigate();
  const {
    profile,
    authUser,
    currentCycle,
    domainFocuses,
    customRoutes,
    todayCheckIns,
    todayCustomRouteCheckIns,
    offlineSyncStatus,
    offlineQueueCount,
    offlineSyncLastError,
    lastVibeCheckDate,
    profileImageDataUrl,
    setDailyCheckIn,
    setCustomRouteCheckIn,
  } = useAppStore();
  const { data: nudge } = useNudge();
  const { data: squadPulse } = useSquadPulse();
  const { data: squadMembers } = useSquadMembers();
  const squadFeatureEnabled = isSquadFeatureEnabled();
  const celebrationPending = useAppStore((s) => s.celebrationPending);
  const setCelebrationPending = useAppStore((s) => s.setCelebrationPending);
  const levelUpPending = useAppStore((s) => s.levelUpPending);
  const setLevelUpPending = useAppStore((s) => s.setLevelUpPending);
  const streakProtectionPending = useAppStore((s) => s.streakProtectionPending);
  const setStreakProtectionPending = useAppStore((s) => s.setStreakProtectionPending);
  const lastCelebrationPhase = useAppStore((s) => s.lastCelebrationPhase);
  const setLastCelebrationPhase = useAppStore((s) => s.setLastCelebrationPhase);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const cycleId = currentCycle?.id ?? null;
  const [, setProtocolDismissVersion] = useState(0);
  const [selectedDomainType, setSelectedDomainType] = useState<DomainType | null>(null);
  const [selectedCustomRouteId, setSelectedCustomRouteId] = useState<string | null>(null);
  const [showKairosExplainer, setShowKairosExplainer] = useState(false);

  const dayInCycle = profile && currentCycle ? getDayInCycle(currentCycle.startDate) : 1;
  const displayDay = Math.min(dayInCycle, KAIROS_CYCLE_LENGTH_DAYS);
  const phaseConfig = getCurrentPhaseConfig(dayInCycle);
  const availableDomains = getAvailableDomains(authUser?.email);
  const activeCustomRoutes = customRoutes.filter((route) => !route.archivedAt);
  const todayIso = toLocalIsoDate(new Date());
  const [dismissedDayProtocol, setDismissedDayProtocol] = useState<DismissedDayProtocol | null>(
    () => readDismissedDayProtocol(todayIso),
  );
  const availableDomainTypes = new Set(availableDomains.map((domain) => domain.type));
  const configuredDomainCount = domainFocuses.filter((focus) =>
    availableDomainTypes.has(focus.domainType),
  ).length;
  const now = new Date();
  const dismissedProtocolForCycle =
    dismissedDayProtocol?.cycleId === cycleId ? dismissedDayProtocol : null;
  const dismissedProtocolAgeMinutes = dismissedProtocolForCycle
    ? (now.getTime() - new Date(dismissedProtocolForCycle.dismissedAt).getTime()) / 60_000
    : 0;
  const baseDayStateProtocol = selectDayStateProtocol({
    now,
    domains: availableDomains,
    todayCheckIns,
    customRoutes: activeCustomRoutes,
    todayCustomRouteCheckIns,
  });
  const dismissedProtocolMatches =
    !!dismissedProtocolForCycle &&
    dismissedProtocolForCycle.targetKey === getProtocolTargetKey(baseDayStateProtocol);
  const shouldEscalateDismissedProtocol =
    dismissedProtocolMatches &&
    dismissedProtocolAgeMinutes >= 60 &&
    dismissedProtocolForCycle.protocolId !== 'catch-up-after-dismiss';
  const dayStateProtocol = selectDayStateProtocol({
    now,
    domains: availableDomains,
    todayCheckIns,
    customRoutes: activeCustomRoutes,
    todayCustomRouteCheckIns,
    dismissedProtocolId: shouldEscalateDismissedProtocol
      ? dismissedProtocolForCycle.protocolId
      : null,
  });
  const activeDayStateProtocol =
    dismissedProtocolMatches &&
    !shouldEscalateDismissedProtocol &&
    dismissedProtocolForCycle.targetKey === getProtocolTargetKey(dayStateProtocol)
      ? null
      : dayStateProtocol;

  useEffect(() => {
    if (!profile?.id) return;
    setShowKairosExplainer(!readKairosExplainerDismissed(profile.id));
  }, [profile?.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Zustand setters are stable; lastCelebrationPhase intentionally excluded to avoid re-triggering after the silent first-load set
  useEffect(() => {
    if (!profile || !currentCycle) return;
    if (dayInCycle >= KAIROS_CYCLE_LENGTH_DAYS && currentCycle.status === 'active') {
      setCelebrationPending(true);
    } else if (!phaseTransitionShownThisSession && phaseConfig.phase !== 'KICKOFF') {
      if (lastCelebrationPhase === null) {
        // First load after this feature shipped: silently record current phase, no banner.
        setLastCelebrationPhase(phaseConfig.phase);
      } else if (phaseConfig.phase !== lastCelebrationPhase) {
        phaseTransitionShownThisSession = true;
        setShowPhaseTransition(true);
      }
    } else if (
      !vibeCheckShownThisSession &&
      shouldShowVibeCheck(lastVibeCheckDate, dayInCycle) &&
      [0, 1].includes(new Date().getDay())
    ) {
      vibeCheckShownThisSession = true;
      setShowVibeCheck(true);
    } else if (
      !domainSetupShownThisSession &&
      configuredDomainCount > 0 &&
      configuredDomainCount < availableDomains.length &&
      dayInCycle >= configuredDomainCount
    ) {
      // Show domain setup modal one domain at a time after the Day 0 win.
      domainSetupShownThisSession = true;
      setShowDomainSetup(true);
    }
  }, [
    profile,
    currentCycle,
    lastVibeCheckDate,
    dayInCycle,
    configuredDomainCount,
    availableDomains.length,
    phaseConfig.phase,
  ]);

  if (!profile || !currentCycle) return null;

  const cyclePct = getCycleProgressPct(dayInCycle);
  const phasePct = getPhaseProgressPct(dayInCycle);
  const phaseLength = phaseConfig.days[1] - phaseConfig.days[0] + 1;
  const phaseDay = Math.min(Math.max(dayInCycle - phaseConfig.days[0] + 1, 1), phaseLength);
  const anchor = IDENTITY_ANCHORS.find((a) => a.id === profile.identityAnchorId);
  const anchorDisplayName =
    profile.identityAnchorId === 'custom'
      ? (profile.customAnchorName ?? 'Custom')
      : (anchor?.name ?? 'Your identity');
  const firstName = profile.displayName.trim().split(/\s+/)[0] || 'You';
  const avatarInitial = firstName.charAt(0).toUpperCase() || 'K';

  const openProtocolTarget = () => {
    const target = activeDayStateProtocol?.target;
    if (!target) {
      navigate('/progress');
      return;
    }
    if (target.kind === 'domain') {
      setSelectedDomainType(target.domainType);
      return;
    }
    setSelectedCustomRouteId(target.routeId);
  };

  const setProtocolTargetTomorrow = () => {
    const target = activeDayStateProtocol?.target;
    if (!target) {
      navigate('/progress');
      return;
    }
    const domainType = target.kind === 'domain' ? target.domainType : target.parentDomainType;
    navigate(`/detail/${getDomainRouteSlug(domainType)}`);
  };

  const markProtocolTargetPartial = () => {
    const target = activeDayStateProtocol?.target;
    if (!target) return;
    if (target.kind === 'domain') {
      void setDailyCheckIn(target.domainType, 'Partial');
    } else {
      void setCustomRouteCheckIn(target.routeId, 'Partial');
    }
  };

  const handleDayProtocolAction = (action: DayStateProtocolAction) => {
    if (!activeDayStateProtocol) return;
    if (action.kind === 'dismiss') {
      const dismissal = {
        cycleId,
        date: todayIso,
        protocolId: activeDayStateProtocol.id,
        targetKey: getProtocolTargetKey(activeDayStateProtocol),
        dismissedAt: new Date().toISOString(),
      };
      writeDismissedDayProtocol(dismissal);
      setDismissedDayProtocol(dismissal);
      setProtocolDismissVersion((version) => version + 1);
      return;
    }
    if (action.kind === 'set_tomorrow') {
      setProtocolTargetTomorrow();
      return;
    }
    if (action.kind === 'mark_partial') {
      markProtocolTargetPartial();
      return;
    }
    openProtocolTarget();
  };

  const dismissKairosExplainer = () => {
    writeKairosExplainerDismissed(profile.id);
    setShowKairosExplainer(false);
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-accent-green/50 bg-base-surface flex items-center justify-center">
            {profileImageDataUrl ? (
              <img
                src={profileImageDataUrl}
                alt={`${profile.displayName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-heading text-2xl font-bold text-accent-green">
                {avatarInitial}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase">
              12-week reset for {firstName}
            </p>
            <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide mt-0.5 truncate">
              Day {displayDay} of {KAIROS_CYCLE_LENGTH_DAYS}
            </h1>
            <p className="text-accent-green text-sm font-heading tracking-wider uppercase mt-0.5">
              {phaseConfig.label}
            </p>
          </div>
        </div>

        <div className="rounded border border-base-border bg-base-surface px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-sm text-base-text tracking-wide">Today's plan</p>
            <p className="text-base-subtext text-xs whitespace-nowrap">
              Day {phaseDay} of {phaseLength}
            </p>
          </div>
          <p className="text-base-muted text-xs mt-1">
            Focus: {anchorDisplayName}. Pick one useful action and keep it visible.
          </p>
        </div>

        <DismissibleTip
          profileId={profile.id}
          tipId="home-framework-categories"
          eyebrow="How it works"
          title="The four categories stay fixed"
        >
          <p>
            12K always uses {CORE_CATEGORY_LABELS.join(', ')}. Your personal sub-focus areas sit
            underneath those categories, so the daily check-in stays simple while the work stays
            personal.
          </p>
        </DismissibleTip>

        {showKairosExplainer && (
          <Card className="border-accent-green/35 bg-accent-green/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-1">
                  Start here
                </p>
                <h2 className="font-heading text-xl font-bold text-base-text tracking-wide">
                  Why Kairos works
                </h2>
              </div>
              <button
                type="button"
                onClick={dismissKairosExplainer}
                className="rounded border border-base-border px-2 py-1 text-base-muted text-xs transition-colors hover:border-base-muted hover:text-base-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                aria-label="Dismiss Kairos explainer"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-base-subtext">
              <p>
                {PRODUCT_POSITIONING.kairosMeaning} 12K uses that idea to turn attention into one
                useful action today.
              </p>
              <div className="rounded border border-base-border bg-base-black/20 p-3">
                <p className="font-heading text-xs uppercase tracking-widest text-base-muted mb-2">
                  KAIROS in 12K
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  {KAIROS_PHASES.map((phase) => (
                    <div key={phase.phase} className="rounded bg-base-surface/70 px-2 py-2">
                      <span className="font-heading text-base-text">
                        {phase.label.charAt(0)} - {phase.label}
                      </span>
                      <span className="block text-base-muted">
                        Days {phase.days[0]}-{phase.days[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                It is built this way because behaviour changes through clear goals, prompts,
                self-monitoring, feedback, repetition, rewards, and recovery after lapses.
              </p>
              <p className="text-base-muted text-xs">{PRODUCT_POSITIONING.proofLoop}</p>
            </div>
          </Card>
        )}

        {/* Level-up celebration */}
        {levelUpPending && (
          <div className="rounded-xl border border-accent-green bg-accent-green/10 px-4 py-4">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-1">
              Level up
            </p>
            <p className="font-heading text-xl font-bold text-base-text tracking-wide">
              Level {levelUpPending.level}: {levelUpPending.label}
            </p>
            <p className="text-base-subtext text-sm mt-1 mb-3">You earned it. Keep building.</p>
            <Button size="sm" variant="ghost" onClick={() => setLevelUpPending(null)}>
              Got it
            </Button>
          </div>
        )}

        {/* Streak protection explanation */}
        {streakProtectionPending &&
          (() => {
            const protectedDomain = availableDomains.find(
              (d) => d.type === streakProtectionPending,
            );
            return (
              <div className="rounded-xl border border-base-border bg-base-surface/80 px-4 py-4">
                <p className="font-heading text-xs text-base-muted tracking-widest uppercase mb-1">
                  Streak protected
                </p>
                <p className="font-heading text-xl font-bold text-base-text tracking-wide">
                  {protectedDomain?.label ?? streakProtectionPending} streak is safe.
                </p>
                <p className="text-base-subtext text-sm mt-1 mb-3">
                  One grace day used this fortnight. The domain was marked Protected instead of
                  Missed.
                </p>
                <Button size="sm" variant="ghost" onClick={() => setStreakProtectionPending(null)}>
                  Got it
                </Button>
              </div>
            );
          })()}

        {/* Phase transition milestone */}
        {showPhaseTransition && (
          <div className="rounded-xl border border-accent-green bg-accent-green/10 px-4 py-4">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-1">
              Phase unlocked
            </p>
            <p className="font-heading text-xl font-bold text-base-text tracking-wide">
              {phaseConfig.label}
            </p>
            <p className="text-base-subtext text-sm mt-1 mb-3">
              {PHASE_MILESTONE_MESSAGES[phaseConfig.phase] ?? `${phaseConfig.label} begins.`}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setLastCelebrationPhase(phaseConfig.phase);
                setShowPhaseTransition(false);
              }}
            >
              Got it
            </Button>
          </div>
        )}

        {/* Progress bars */}
        <Card>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-xs text-base-subtext mb-1.5">
                <span>Journey</span>
                <span>{cyclePct}%</span>
              </div>
              <div className="h-1.5 bg-base-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-green rounded-full transition-all"
                  style={{ width: `${cyclePct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-base-subtext mb-1.5">
                <span>{phaseConfig.label}</span>
                <span>{phasePct}%</span>
              </div>
              <div className="h-1.5 bg-base-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-green/60 rounded-full transition-all"
                  style={{ width: `${phasePct}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-base-subtext text-xs mt-3 italic">{phaseConfig.tagline}</p>
        </Card>

        {offlineSyncStatus !== 'idle' && (
          <Card
            className={
              offlineSyncStatus === 'degraded' || offlineSyncStatus === 'error'
                ? 'border-status-partial/50 bg-status-partial/5'
                : 'border-accent-green/30 bg-accent-green/5'
            }
          >
            <p className="font-heading text-xs text-base-subtext tracking-widest uppercase mb-1">
              {offlineSyncStatus === 'syncing' ? 'Syncing' : 'Offline ready'}
            </p>
            <p className="text-base-text text-sm leading-snug">
              {offlineSyncStatus === 'degraded'
                ? 'This device is blocking offline storage. Keep the app open until your changes save.'
                : offlineSyncStatus === 'error'
                  ? 'Your latest action is saved on this device and will retry shortly.'
                  : offlineQueueCount > 0
                    ? `${offlineQueueCount} action${offlineQueueCount === 1 ? '' : 's'} waiting to sync.`
                    : 'Checking for saved actions.'}
            </p>
            {offlineSyncLastError && (
              <p className="text-base-muted text-xs mt-2">{offlineSyncLastError}</p>
            )}
          </Card>
        )}

        {activeDayStateProtocol && (
          <Card
            data-testid="day-state-protocol"
            className={
              activeDayStateProtocol.type === 'early_wake'
                ? 'border-accent-green/40 bg-accent-green/5'
                : activeDayStateProtocol.type === 'shutdown'
                  ? 'border-status-missed/45 bg-status-missed/5'
                  : activeDayStateProtocol.type === 'catch_up'
                    ? 'border-status-partial/50 bg-status-partial/5'
                    : 'border-white/10 bg-base-surface/90'
            }
          >
            <p className="font-heading text-xs text-base-subtext tracking-widest uppercase mb-1">
              Right now
            </p>
            <p className="font-heading text-base-text text-lg tracking-wide">
              {activeDayStateProtocol.title}
            </p>
            <p className="text-base-text text-sm leading-snug mt-1">
              {activeDayStateProtocol.body}
            </p>
            <div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-3">
              {activeDayStateProtocol.steps.map((step) => (
                <div key={step} className="rounded border border-base-border bg-base-black/20 p-2">
                  <p className="text-base-subtext text-xs leading-snug">{step}</p>
                </div>
              ))}
            </div>
            {activeDayStateProtocol.actions.some((action) => action.kind === 'mark_partial') && (
              <p className="text-base-muted text-xs mt-3">
                "Part done" means you did a smaller version - it still counts.
              </p>
            )}
            {activeDayStateProtocol.actions.some((action) => action.kind === 'dismiss') && (
              <p className="text-base-muted text-xs mt-3">
                "Not now" hides this for a while. If the item stays open, Kairos may offer a smaller
                option later today.
              </p>
            )}
            <div className="flex flex-col gap-2 mt-3 sm:flex-row sm:flex-wrap">
              {activeDayStateProtocol.actions.map((action, index) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={
                    index === 0 ? 'primary' : action.kind === 'mark_partial' ? 'secondary' : 'ghost'
                  }
                  onClick={() => handleDayProtocolAction(action)}
                  className="w-full sm:w-auto"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Today's nudge preview */}
        {nudge && nudge.status === 'new' && (
          <button type="button" className="w-full text-left" onClick={() => navigate('/improve')}>
            <Card className="border-accent-green/30 hover:border-accent-green/60 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-1">
                    Today's nudge
                  </p>
                  <p className="text-base-text text-sm font-medium leading-snug truncate">
                    {nudge.title}
                  </p>
                </div>
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent-green shrink-0 mt-1"
                >
                  <path d="M5 2l5 5-5 5" />
                </svg>
              </div>
            </Card>
          </button>
        )}

        {/* Squad */}
        {squadFeatureEnabled && hasBrotherhoodAccess(profile.tier) && profile.squadId && (
          <Card>
            <p className="font-heading text-xs text-base-subtext tracking-widest uppercase mb-3">
              Squad
            </p>

            {/* Anonymous member tiles */}
            {squadMembers && squadMembers.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {squadMembers.map((m) => (
                  <div key={m.memberIndex} className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-base-border flex items-center justify-center">
                      <span className="font-heading font-bold text-xs text-base-subtext">
                        {m.anchorInitial}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weekly pulse message */}
            {squadPulse && (
              <p className="text-base-text text-xs italic border-t border-base-border pt-2 mt-1">
                Week {squadPulse.weekNumber}: {squadPulse.message}
              </p>
            )}
          </Card>
        )}

        {/* Domain check-ins */}
        <div>
          <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
            Today
          </h2>
          <div className="flex flex-col gap-2">
            {availableDomains.map((domain) => {
              const focus = domainFocuses.find((f) => f.domainType === domain.type);
              const checkIn = todayCheckIns[domain.type];
              const status: CheckInStatus = checkIn?.status ?? 'Pending';
              const displayLabel = getDailyDomainLabel(domain);
              const routesForDomain = activeCustomRoutes.filter(
                (route) => route.parentDomainType === domain.type,
              );

              return (
                <div key={domain.type} className="flex flex-col gap-1.5">
                  <div
                    data-testid={`daily-domain-row-${domain.type}`}
                    className={`w-full rounded-lg border p-3 shadow-[0_12px_34px_rgba(0,0,0,0.18)] transition-colors ${STATUS_ROW_CLASSES[status]}`}
                  >
                    <div className="text-left">
                      <div className="flex items-start justify-between gap-3">
                        <span className={`font-heading font-medium tracking-wide ${domain.colour}`}>
                          {displayLabel}
                        </span>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-heading uppercase tracking-wider ${STATUS_BADGE_CLASSES[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                      {focus && (
                        <p className="text-base-subtext text-xs mt-1.5 truncate">
                          {focus.focusDescription}
                        </p>
                      )}
                      {!focus && (
                        <p className="text-base-muted text-xs mt-1.5">
                          Check in now, or open details to set tomorrow.
                        </p>
                      )}
                      {status === 'Protected' && (
                        <p className="text-base-muted text-xs mt-1.5">
                          Streak protected. Counts as a recovery day.
                        </p>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="min-h-10 rounded-md border border-accent-green/50 bg-accent-green/10 px-3 py-2 text-center font-heading text-xs font-semibold uppercase tracking-wider text-accent-green transition-colors hover:bg-accent-green/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                        onClick={() => setSelectedDomainType(domain.type)}
                        aria-label={`Check in ${displayLabel}`}
                      >
                        Check in
                      </button>
                      <button
                        type="button"
                        className="min-h-10 rounded-md border border-base-border bg-base-black/20 px-3 py-2 text-center font-heading text-xs font-semibold uppercase tracking-wider text-base-subtext transition-colors hover:border-base-muted hover:text-base-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                        onClick={() => navigate(`/detail/${getDomainRouteSlug(domain.type)}`)}
                        aria-label={`Open ${displayLabel} details`}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                  {routesForDomain.length > 0 && (
                    <div className="ml-3 flex flex-col gap-1.5 border-l border-base-border pl-3">
                      {routesForDomain.map((route) => {
                        const checkIn = todayCustomRouteCheckIns[route.id];
                        const routeStatus: CheckInStatus =
                          checkIn?.date === todayIso ? checkIn.status : 'Pending';

                        return (
                          <button
                            key={route.id}
                            type="button"
                            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${STATUS_ROW_CLASSES[routeStatus]}`}
                            onClick={() => setSelectedCustomRouteId(route.id)}
                            aria-label={`Check in ${route.label}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-heading text-sm font-medium tracking-wide text-base-text truncate">
                                {route.label}
                              </span>
                              <span
                                className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-heading uppercase tracking-wider ${STATUS_BADGE_CLASSES[routeStatus]}`}
                              >
                                {STATUS_LABELS[routeStatus]}
                              </span>
                            </div>
                            <p className="text-base-subtext text-xs mt-1 truncate">
                              {route.focusDescription}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {celebrationPending && <Day84CompletionModal onClose={() => setCelebrationPending(false)} />}
      {showDomainSetup && !showVibeCheck && !celebrationPending && (
        <ProgressiveDomainSetupModal onClose={() => setShowDomainSetup(false)} />
      )}
      {showVibeCheck && <WeeklyVibeCheckModal onClose={() => setShowVibeCheck(false)} />}
      {selectedDomainType &&
        (() => {
          const domain = availableDomains.find((d) => d.type === selectedDomainType);
          if (!domain) return null;
          return (
            <CheckInStatusModal
              label={getDailyDomainLabel(domain)}
              currentStatus={todayCheckIns[selectedDomainType]?.status}
              onSelect={(status) => {
                void setDailyCheckIn(selectedDomainType, status);
                setSelectedDomainType(null);
              }}
              onClose={() => setSelectedDomainType(null)}
            />
          );
        })()}
      {selectedCustomRouteId &&
        (() => {
          const route = activeCustomRoutes.find((r) => r.id === selectedCustomRouteId);
          if (!route) return null;
          const checkIn = todayCustomRouteCheckIns[selectedCustomRouteId];
          const currentStatus: CheckInStatus =
            checkIn?.date === todayIso ? checkIn.status : 'Pending';
          return (
            <CheckInStatusModal
              label={route.label}
              currentStatus={currentStatus}
              onSelect={(status) => {
                void setCustomRouteCheckIn(selectedCustomRouteId, status);
                setSelectedCustomRouteId(null);
              }}
              onClose={() => setSelectedCustomRouteId(null)}
            />
          );
        })()}
    </>
  );
}
