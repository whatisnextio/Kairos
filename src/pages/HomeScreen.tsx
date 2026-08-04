import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Day84CompletionModal from '@/components/modals/Day84CompletionModal';
import ProgressiveDomainSetupModal from '@/components/modals/ProgressiveDomainSetupModal';
import WeeklyVibeCheckModal from '@/components/modals/WeeklyVibeCheckModal';
import { useNudge } from '@/hooks/useNudge';
import { useSquadMembers, useSquadPulse } from '@/hooks/useSquad';
import { useAppStore } from '@/store/useAppStore';
import {
  type CheckInStatus,
  type DomainType,
  IDENTITY_ANCHORS,
  KAIROS_CYCLE_LENGTH_DAYS,
  getAvailableDomains,
} from '@/types';
import {
  getCurrentPhaseConfig,
  getCycleProgressPct,
  getDayInCycle,
  getPhaseProgressPct,
} from '@/utils/kairos';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS: Record<CheckInStatus, string> = {
  Done: 'Done',
  Partial: 'Partial',
  Missed: 'Missed',
  Pending: 'Tap to check in',
  Protected: 'Protected',
};

const STATUS_COLOURS: Record<CheckInStatus, string> = {
  Done: 'border-status-done text-status-done',
  Partial: 'border-status-partial text-status-partial',
  Missed: 'border-status-missed text-status-missed',
  Pending: 'border-base-border text-base-subtext hover:border-base-muted',
  Protected: 'border-base-muted text-base-muted',
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

// Module-level flags: prevent re-prompting within the same JS session even if HomeScreen remounts
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
    lastVibeCheckDate,
    setDailyCheckIn,
    setCustomRouteCheckIn,
  } = useAppStore();
  const { data: nudge } = useNudge();
  const { data: squadPulse } = useSquadPulse();
  const { data: squadMembers } = useSquadMembers();
  const celebrationPending = useAppStore((s) => s.celebrationPending);
  const setCelebrationPending = useAppStore((s) => s.setCelebrationPending);
  const levelUpPending = useAppStore((s) => s.levelUpPending);
  const setLevelUpPending = useAppStore((s) => s.setLevelUpPending);
  const lastCelebrationPhase = useAppStore((s) => s.lastCelebrationPhase);
  const setLastCelebrationPhase = useAppStore((s) => s.setLastCelebrationPhase);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);

  const dayInCycle = profile && currentCycle ? getDayInCycle(currentCycle.startDate) : 1;
  const displayDay = Math.min(dayInCycle, KAIROS_CYCLE_LENGTH_DAYS);
  const phaseConfig = getCurrentPhaseConfig(dayInCycle);
  const availableDomains = getAvailableDomains(authUser?.email);
  const activeCustomRoutes = customRoutes.filter((route) => !route.archivedAt);
  const availableDomainTypes = new Set(availableDomains.map((domain) => domain.type));
  const configuredDomainCount = domainFocuses.filter((focus) =>
    availableDomainTypes.has(focus.domainType),
  ).length;

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
  const anchor = IDENTITY_ANCHORS.find((a) => a.id === profile.identityAnchorId);
  const anchorDisplayName =
    profile.identityAnchorId === 'custom'
      ? (profile.customAnchorName ?? 'Custom')
      : (anchor?.name ?? 'Your identity');

  const handleCheckIn = (domain: DomainType, current: CheckInStatus | undefined) => {
    if (current === 'Done') {
      setDailyCheckIn(domain, 'Partial');
    } else if (current === 'Partial') {
      setDailyCheckIn(domain, 'Missed');
    } else {
      setDailyCheckIn(domain, 'Done');
    }
  };

  const handleCustomRouteCheckIn = (routeId: string, current: CheckInStatus | undefined) => {
    if (current === 'Done') {
      setCustomRouteCheckIn(routeId, 'Partial');
    } else if (current === 'Partial') {
      setCustomRouteCheckIn(routeId, 'Missed');
    } else {
      setCustomRouteCheckIn(routeId, 'Done');
    }
  };

  return (
    <>
      <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
        {/* Header */}
        <div>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase">
            {anchorDisplayName}
          </p>
          <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide mt-0.5">
            Day {displayDay} of {KAIROS_CYCLE_LENGTH_DAYS}
          </h1>
          <p className="text-accent-green text-sm font-heading tracking-wider uppercase mt-0.5">
            {phaseConfig.label} Phase
          </p>
        </div>

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
                <span>Cycle</span>
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

        {/* Squad: Brotherhood only */}
        {profile.tier === 'brotherhood' && profile.squadId && (
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
            {availableDomains.map((d) => {
              const focus = domainFocuses.find((f) => f.domainType === d.type);
              const checkIn = todayCheckIns[d.type];
              const status: CheckInStatus = checkIn?.status ?? 'Pending';

              return (
                <div
                  key={d.type}
                  className={`w-full flex rounded border transition-colors ${STATUS_COLOURS[status]} bg-base-surface`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left p-4"
                    onClick={() => handleCheckIn(d.type, checkIn?.status)}
                    aria-label={`Check in ${d.label}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-heading font-medium tracking-wide ${d.colour}`}>
                        {d.label}
                      </span>
                      <span className="text-xs">{STATUS_LABELS[status]}</span>
                    </div>
                    {focus && (
                      <p className="text-base-subtext text-xs mt-1 truncate">
                        {focus.focusDescription}
                      </p>
                    )}
                    {!focus && (
                      <p className="text-base-muted text-xs mt-1">Set your focus for tomorrow.</p>
                    )}
                  </button>
                  <button
                    type="button"
                    className="px-3 flex items-center text-base-muted hover:text-base-subtext transition-colors border-l border-current/20"
                    onClick={() => navigate(`/detail/${d.type.toLowerCase()}`)}
                    aria-label={`View ${d.label} detail`}
                  >
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
                    >
                      <path d="M5 2l5 5-5 5" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {activeCustomRoutes.map((route) => {
              const checkIn = todayCustomRouteCheckIns[route.id];
              const today = new Date().toISOString().split('T')[0];
              const status: CheckInStatus = checkIn?.date === today ? checkIn.status : 'Pending';

              return (
                <div
                  key={route.id}
                  className={`w-full flex rounded border transition-colors ${STATUS_COLOURS[status]} bg-base-surface`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left p-4"
                    onClick={() => handleCustomRouteCheckIn(route.id, status)}
                    aria-label={`Check in ${route.label}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-heading font-medium tracking-wide text-base-text truncate">
                        {route.label}
                      </span>
                      <span className="text-xs shrink-0">{STATUS_LABELS[status]}</span>
                    </div>
                    <p className="text-base-subtext text-xs mt-1 truncate">
                      {route.focusDescription}
                    </p>
                  </button>
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
    </>
  );
}
