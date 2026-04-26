import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { getDayInCycle, getCurrentPhaseConfig, getCycleProgressPct, getPhaseProgressPct } from '@/utils/kairos';
import { DOMAINS, IDENTITY_ANCHORS, type DomainType, type CheckInStatus } from '@/types';
import Card from '@/components/common/Card';
import WeeklyVibeCheckModal from '@/components/modals/WeeklyVibeCheckModal';
import ProgressiveDomainSetupModal from '@/components/modals/ProgressiveDomainSetupModal';

const STATUS_LABELS: Record<CheckInStatus, string> = {
  Done: 'Done',
  Partial: 'Partial',
  Missed: 'Missed',
  Pending: 'Tap to check in',
  Protected: 'Protected',
};

const STATUS_COLOURS: Record<CheckInStatus, string> = {
  Done:      'border-status-done text-status-done',
  Partial:   'border-status-partial text-status-partial',
  Missed:    'border-status-missed text-status-missed',
  Pending:   'border-base-border text-base-subtext hover:border-base-muted',
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

export default function HomeScreen() {
  const navigate = useNavigate();
  const { profile, currentCycle, domainFocuses, todayCheckIns, lastVibeCheckDate, setDailyCheckIn } = useAppStore();
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);

  const dayInCycle = profile && currentCycle ? getDayInCycle(currentCycle.startDate) : 1;

  useEffect(() => {
    if (!profile || !currentCycle) return;
    if (shouldShowVibeCheck(lastVibeCheckDate, dayInCycle) && new Date().getDay() === 0) {
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
            {anchor?.name ?? 'Your identity'}
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
                      <p className="text-base-subtext text-xs mt-1 truncate">{focus.focusDescription}</p>
                    )}
                    {!focus && (
                      <p className="text-base-muted text-xs mt-1">Set your focus for tomorrow.</p>
                    )}
                  </button>
                  <button
                    className="px-3 flex items-center text-base-muted hover:text-base-subtext transition-colors border-l border-current/20"
                    onClick={() => navigate(`/detail/${d.type.toLowerCase()}`)}
                    aria-label={`View ${d.label} detail`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 2l5 5-5 5" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showDomainSetup && !showVibeCheck && (
        <ProgressiveDomainSetupModal onClose={() => setShowDomainSetup(false)} />
      )}
      {showVibeCheck && (
        <WeeklyVibeCheckModal onClose={() => setShowVibeCheck(false)} />
      )}
    </>
  );
}
