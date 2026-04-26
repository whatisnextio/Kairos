import { useAppStore } from '@/store/useAppStore';
import { getDayInCycle, getCurrentPhaseConfig, KAIROS_PHASES } from '@/utils/kairos';
import type { KairosPhaseConfig } from '@/types';
import { getLevelForXp, getXpProgressInLevel } from '@/utils/gamification';
import { DOMAINS } from '@/types';
import Card from '@/components/common/Card';

const STATUS_DOT: Record<string, string> = {
  Done:      'bg-status-done',
  Partial:   'bg-status-partial',
  Missed:    'bg-status-missed',
  Pending:   'bg-base-border',
  Protected: 'bg-domain-spirit',
};

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function ProgressScreen() {
  const { profile, currentCycle, todayCheckIns, checkInHistory } = useAppStore();

  if (!profile || !currentCycle) return null;

  const dayInCycle = getDayInCycle(currentCycle.startDate);
  const currentPhase = getCurrentPhaseConfig(dayInCycle);
  const level = getLevelForXp(profile.xp);
  const xpProgress = getXpProgressInLevel(profile.xp);
  const last7 = getLast7Days();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">Progress</h1>

      {/* XP / Level */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">Level {level.level}</p>
        <p className="font-heading text-xl font-bold text-base-text">{level.label}</p>
        <p className="text-base-subtext text-xs mt-1">{profile.xp} XP total</p>
        <div className="mt-3 h-1.5 bg-base-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-green rounded-full transition-all"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <p className="text-base-muted text-xs mt-1">{xpProgress}% to Level {level.level + 1}</p>
      </Card>

      {/* 7-day domain grid */}
      <Card>
        <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
          Last 7 days
        </h2>

        {/* Day headers */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-2">
          <div />
          {last7.map((date) => {
            const d = new Date(date + 'T00:00:00');
            const label = d.toLocaleDateString('en-GB', { weekday: 'narrow' });
            const isToday = date === today;
            return (
              <div key={date} className="text-center">
                <span className={`text-xs ${isToday ? 'text-accent-green font-medium' : 'text-base-muted'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Domain rows: pulled from local checkInHistory (all tiers) */}
        {DOMAINS.map((d) => (
          <div key={d.type} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1.5 items-center">
            <span className={`text-xs font-heading font-medium ${d.colour}`}>{d.label}</span>
            {last7.map((date) => {
              const status =
                date === today
                  ? (todayCheckIns[d.type]?.status ?? 'Pending')
                  : (checkInHistory[date]?.[d.type] ?? undefined);
              const dotClass = status ? (STATUS_DOT[status] ?? 'bg-base-border') : 'bg-base-border/40';
              return (
                <div key={date} className="flex justify-center">
                  <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                </div>
              );
            })}
          </div>
        ))}

        <p className="text-base-muted text-xs mt-3">Last 7 days from local history.</p>
      </Card>

      {/* Phase timeline */}
      <Card>
        <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
          KAIROS Phases
        </h2>
        <div className="flex flex-col gap-2">
          {KAIROS_PHASES.map((phase: KairosPhaseConfig) => {
            const isActive = phase.phase === currentPhase.phase;
            const isPast = phase.days[1] < dayInCycle;
            return (
              <div
                key={phase.phase}
                className={`flex items-center gap-3 p-2 rounded ${
                  isActive ? 'bg-accent-green/10 border border-accent-green/30' : ''
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isActive ? 'bg-accent-green' : isPast ? 'bg-base-muted' : 'bg-base-border'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-heading text-xs font-medium tracking-wider uppercase ${
                      isActive ? 'text-accent-green' : isPast ? 'text-base-muted' : 'text-base-subtext'
                    }`}
                  >
                    {phase.label}
                  </p>
                  <p className="text-base-muted text-xs">Days {phase.days[0]}-{phase.days[1]}</p>
                </div>
                {isPast && <span className="text-base-muted text-xs">Done</span>}
                {isActive && <span className="text-accent-green text-xs">Active</span>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
