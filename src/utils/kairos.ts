import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import type { KairosPhase, KairosPhaseConfig } from '@/types';
import { KAIROS_PHASES } from '@/types';

export { KAIROS_PHASES };

export function getDayInCycle(cycleStartDate: string): number {
  const start = startOfDay(parseISO(cycleStartDate));
  const today = startOfDay(new Date());
  return Math.max(1, differenceInDays(today, start) + 1);
}

export function getCurrentPhaseConfig(dayInCycle: number): KairosPhaseConfig {
  const phase = KAIROS_PHASES.find(
    (p) => dayInCycle >= p.days[0] && dayInCycle <= p.days[1],
  );
  return phase ?? KAIROS_PHASES[KAIROS_PHASES.length - 1];
}

export function getCurrentPhase(cycleStartDate: string): KairosPhase {
  return getCurrentPhaseConfig(getDayInCycle(cycleStartDate)).phase;
}

export function getCycleProgressPct(dayInCycle: number): number {
  return Math.min(100, Math.round((dayInCycle / 84) * 100));
}

export function getPhaseProgressPct(dayInCycle: number): number {
  const config = getCurrentPhaseConfig(dayInCycle);
  const phaseDay = dayInCycle - config.days[0] + 1;
  const phaseDuration = config.days[1] - config.days[0] + 1;
  return Math.min(100, Math.round((phaseDay / phaseDuration) * 100));
}

export function isCycleComplete(dayInCycle: number): boolean {
  return dayInCycle >= 84;
}
