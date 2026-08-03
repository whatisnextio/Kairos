import type { CheckInStatus, DomainType } from '@/types';

/**
 * Computes current and longest streaks for a single domain from local check-in history.
 *
 * Scans backwards up to 90 days from `referenceDate` (defaults to today).
 * currentStreak: the unbroken qualifying run ending on referenceDate (0 if today is empty/missed).
 * longestStreak: the maximum unbroken run anywhere in the 90-day window.
 *
 * Qualifying statuses: 'Done' or 'Partial'.
 */
export function computeLocalStreak(
  history: Record<string, Partial<Record<DomainType, CheckInStatus>>>,
  domainType: DomainType,
  referenceDate?: string,
): { currentStreak: number; longestStreak: number } {
  const refDate = referenceDate ?? new Date().toISOString().split('T')[0];
  const refMs = new Date(`${refDate}T00:00:00Z`).getTime();

  let currentStreak = 0;
  let longestStreak = 0;
  let running = 0;
  let pastCurrentStreak = false;

  for (let i = 0; i < 400; i++) {
    const d = new Date(refMs - i * 86_400_000).toISOString().split('T')[0];
    const s = history[d]?.[domainType];
    if (s === 'Done' || s === 'Partial') {
      running++;
      if (!pastCurrentStreak) currentStreak = running;
    } else {
      if (running > longestStreak) longestStreak = running;
      running = 0;
      pastCurrentStreak = true;
    }
  }
  longestStreak = Math.max(longestStreak, running);

  return { currentStreak, longestStreak };
}
