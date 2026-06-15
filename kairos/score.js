// Kairos scoring engine. Pure functions, no DOM or browser globals, so the same
// module powers the app in the browser and runs under vitest in Node.
//
// The Kairos Score is a single 0-100 number built from four weighted inputs
// (see the V2MOM):
//
//   Training activity        40%  manual now; Garmin / MyZone in Phase 2
//   Recovery (sleep + HRV)   30%  manual now; Oura / Garmin in Phase 2
//   Alcohol-free day         20%  one manual tap
//   Streak bonus             10%  calculated in-app from prior days
//
// Training and Recovery are kept as separate axes on purpose: Recovery is the
// one that surfaces overwork and burnout, so a heavy-but-wrecked day still
// reads as a bad day. That honesty is the whole point.

/** Score at or above which a day counts towards the streak. */
export const STREAK_THRESHOLD = 60;

/** Training is 40% of the score. */
export const TRAINING_WEIGHT = 0.4;

/** Recovery (sleep + HRV) is 30% of the score. */
export const RECOVERY_WEIGHT = 0.3;

/** A confirmed alcohol-free day is worth a flat 20 points. */
export const ALCOHOL_FREE_POINTS = 20;

/** The streak bonus tops out at 10 points, reached at a 10 day streak. */
export const STREAK_BONUS_MAX = 10;

/** Clamp a number into an inclusive range. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * The streak bonus for a given incoming streak length. Linear: one point per
 * day, capped at STREAK_BONUS_MAX. Uses the streak built *before* today so the
 * score has no circular dependency on itself.
 */
export function streakBonus(incomingStreak) {
  return clamp(Math.round(incomingStreak), 0, STREAK_BONUS_MAX);
}

/**
 * Compute today's Kairos Score (0-100).
 * @param {{ training: number, recovery: number, alcoholFree: boolean, incomingStreak?: number }} input
 */
export function computeScore({ training, recovery, alcoholFree, incomingStreak = 0 }) {
  const trainingPart = clamp(training, 0, 100) * TRAINING_WEIGHT;
  const recoveryPart = clamp(recovery, 0, 100) * RECOVERY_WEIGHT;
  const alcoholPart = alcoholFree ? ALCOHOL_FREE_POINTS : 0;
  const bonusPart = streakBonus(incomingStreak);
  return clamp(Math.round(trainingPart + recoveryPart + alcoholPart + bonusPart), 0, 100);
}

/** Parse a YYYY-MM-DD date string to a UTC-midnight timestamp (ms). */
function dayMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

const ONE_DAY_MS = 86_400_000;

/** Whole-day difference between two YYYY-MM-DD strings (a - b). */
export function daysBetween(a, b) {
  return Math.round((dayMs(a) - dayMs(b)) / ONE_DAY_MS);
}

/** Sort entries oldest-first by date without mutating the input. */
function sortedByDate(entries) {
  return [...entries].sort((a, b) => dayMs(a.date) - dayMs(b.date));
}

/**
 * Count trailing consecutive days that satisfy a predicate, ending at the most
 * recent entry. A calendar gap (a missed day) breaks the run. The most recent
 * entry must itself satisfy the predicate, or the streak is 0.
 */
function trailingRun(entries, predicate) {
  const sorted = sortedByDate(entries);
  let run = 0;
  let prevDate = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const entry = sorted[i];
    if (prevDate !== null && daysBetween(prevDate, entry.date) !== 1) break;
    if (!predicate(entry)) break;
    run += 1;
    prevDate = entry.date;
  }
  return run;
}

/**
 * Current Kairos streak: trailing consecutive days with score >= threshold.
 * @param {Array<{date: string, score: number}>} entries
 */
export function computeStreak(entries, threshold = STREAK_THRESHOLD) {
  return trailingRun(entries, (e) => e.score >= threshold);
}

/**
 * The streak coming *into* a given date, i.e. the streak built by every entry
 * strictly before it. This is what feeds the streak bonus for that day.
 */
export function incomingStreakFor(entries, date, threshold = STREAK_THRESHOLD) {
  const prior = entries.filter((e) => daysBetween(e.date, date) < 0);
  return computeStreak(prior, threshold);
}

/** Current alcohol-free streak: trailing consecutive confirmed dry days. */
export function alcoholFreeStreak(entries) {
  return trailingRun(entries, (e) => e.alcoholFree === true);
}

/** Longest run of consecutive days satisfying a predicate, anywhere in history. */
function longestRun(entries, predicate) {
  const sorted = sortedByDate(entries);
  let best = 0;
  let current = 0;
  let prevDate = null;
  for (const entry of sorted) {
    const consecutive = prevDate !== null && daysBetween(entry.date, prevDate) === 1;
    if (predicate(entry)) {
      current = consecutive ? current + 1 : 1;
    } else {
      current = 0;
    }
    if (current > best) best = current;
    prevDate = entry.date;
  }
  return best;
}

/**
 * Personal bests across all history.
 * @param {Array<{date: string, score: number, alcoholFree: boolean}>} entries
 */
export function personalBests(entries, threshold = STREAK_THRESHOLD) {
  const bestScore = entries.reduce((max, e) => Math.max(max, e.score), 0);
  return {
    bestScore,
    longestStreak: longestRun(entries, (e) => e.score >= threshold),
    longestAlcoholFree: longestRun(entries, (e) => e.alcoholFree === true),
  };
}

/**
 * The last `count` days of scores for the trend line, oldest-first. Only real
 * entries are returned; gaps are not back-filled.
 */
export function recentTrend(entries, count = 7) {
  return sortedByDate(entries)
    .slice(-count)
    .map((e) => ({ date: e.date, score: e.score }));
}

/**
 * Is the score trending down across the last `days` consecutive entries?
 * True only when there are at least `days` entries and each is strictly lower
 * than the one before. Drives the "three days dropping" notification.
 */
export function isTrendingDown(entries, days = 3) {
  const trend = recentTrend(entries, days);
  if (trend.length < days) return false;
  for (let i = 1; i < trend.length; i++) {
    if (trend[i].score >= trend[i - 1].score) return false;
  }
  return true;
}
