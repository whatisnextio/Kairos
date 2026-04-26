import { useAppStore } from '@/store/useAppStore';
import { getDayInCycle, getCurrentPhaseConfig, KAIROS_PHASES } from '@/utils/kairos';
import type { KairosPhaseConfig } from '@/types';
import { getLevelForXp, getXpProgressInLevel } from '@/utils/gamification';
import Card from '@/components/common/Card';

export default function ProgressScreen() {
  const { profile, currentCycle } = useAppStore();

  if (!profile || !currentCycle) return null;

  const dayInCycle = getDayInCycle(currentCycle.startDate);
  const currentPhase = getCurrentPhaseConfig(dayInCycle);
  const level = getLevelForXp(profile.xp);
  const xpProgress = getXpProgressInLevel(profile.xp);

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
                  <p className="text-base-muted text-xs">Days {phase.days[0]}–{phase.days[1]}</p>
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
