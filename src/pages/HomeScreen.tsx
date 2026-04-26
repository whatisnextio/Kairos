import Card from '@/components/common/Card';
import Day84CompletionModal from '@/components/modals/Day84CompletionModal';
import ProgressiveDomainSetupModal from '@/components/modals/ProgressiveDomainSetupModal';
import WeeklyVibeCheckModal from '@/components/modals/WeeklyVibeCheckModal';
import { useNudge } from '@/hooks/useNudge';
import { useSquadMembers, useSquadPulse } from '@/hooks/useSquad';
import { useAppStore } from '@/store/useAppStore';
import { type CheckInStatus, DOMAINS, type DomainType, IDENTITY_ANCHORS } from '@/types';
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
  Protected: 'border-domain-spirit text-domain-spirit',
};

function shouldShowVibeCheck(lastVibeCheckDate: string | null, dayInCycle: number): boolean {
  if (dayInCycle < 7) return false;
  if (!lastVibeCheckDate) return true;
  const last = new Date(lastVibeCheckDate);
  const today = new Date();
  const daysSince = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
  return daysSince >= 7;
}

// Module-level flag: prevents re-prompting within the same JS session even if HomeScreen remounts
let vibeCheckShownThisSession = false;

export default function HomeScreen() {
  const navigate = useNavigate();
  const {
    profile,
    currentCycle,
    domainFocuses,
    todayCheckIns,
    lastVibeCheckDate,
    setDailyCheckIn,
  } = useAppStore();
  const { data: nudge } = useNudge();
  const { data: squadPulse } = useSquadPulse();
  const { data: squadMembers } = useSquadMembers();
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);
  const [showDay84, setShowDay84] = useState(false);

  const dayInCycle = profile && currentCycle ? getDayInCycle(currentCycle.startDate) : 1;

  useEffect(() => {
    if (!profile || !currentCycle) return;
    if (dayInCycle >= 84 && currentCycle.status === 'active') {
      setShowDay84(true);
    } else if (
      !vibeCheckShownThisSession &&
      shouldShowVibeCheck(lastVibeCheckDate, dayInCycle) &&
      new Date().getDay() === 0
    ) {
      vibeCheckShownThisSession = true;
      setShowVibeCheck(true);
    } else if (dayInCycle >= 2 && domainFocuses.length < 4) {
      setShowDomainSetup(true);
    }
  }, [profile, currentCycle, lastVibeCheckDate, dayInCycle, domainFocuses.length]);

  if (!profile || !currentCycle) return null;

  const phaseConfig = getCurrentPhaseConfig(dayInCycle);
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

  return (
    <>
      <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
        {/* Header */}
        <div>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase">
            {anchorDisplayName}
          </p>
          <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide mt-0.5">
            Day {dayInCycle} of 84
          </h1>
          <p className="text-accent-green text-sm font-heading tracking-wider uppercase mt-0.5">
            {phaseConfig.label} Phase
          </p>
        </div>

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
                {squadMembers.map((m) => {
                  const dots = [m.bodyStatus, m.loveStatus, m.missionStatus, m.spiritStatus];
                  return (
                    <div key={m.memberIndex} className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-base-border flex items-center justify-center">
                        <span className="font-heading font-bold text-xs text-base-subtext">
                          {m.anchorInitial}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {(['body', 'love', 'mission', 'spirit'] as const).map((domain, i) => {
                          const status = dots[i];
                          let dotClass = 'bg-base-border/50';
                          if (status === 'Done') dotClass = 'bg-status-done';
                          else if (status === 'Partial') dotClass = 'bg-status-partial';
                          else if (status === 'Missed') dotClass = 'bg-status-missed';
                          return (
                            <div key={domain} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
            {DOMAINS.map((d) => {
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
          </div>
        </div>
      </div>

      {showDay84 && <Day84CompletionModal onClose={() => setShowDay84(false)} />}
      {showDomainSetup && !showVibeCheck && !showDay84 && (
        <ProgressiveDomainSetupModal onClose={() => setShowDomainSetup(false)} />
      )}
      {showVibeCheck && <WeeklyVibeCheckModal onClose={() => setShowVibeCheck(false)} />}
    </>
  );
}
