// Kairos notification copy — pure functions, no DOM or native deps.
// Delivery (Capacitor LocalNotifications) lives in delivery.js so these
// message builders stay unit-testable in Node without any browser globals.

export const REMINDERS = [
  { id: 'earlybird', hour: 5, minute: 0 },
  { id: 'morning', hour: 7, minute: 30 },
  { id: 'midday', hour: 12, minute: 0 },
  { id: 'afternoon', hour: 17, minute: 0 },
  { id: 'evening', hour: 20, minute: 0 },
];

export function morningBrief(yesterdayScore, streak) {
  const score = yesterdayScore == null ? 'not logged' : String(yesterdayScore);
  return `Yesterday: ${score}. Streak: ${streak} days. Floor holds today.`;
}

export function reminderMessage(id, state) {
  switch (id) {
    case 'earlybird':
      return '5am. Water. Supplements. Move. Back to bed after.';
    case 'morning':
      return morningBrief(state.yesterdayScore, state.streak);
    case 'midday':
      return 'Midday check. Floor holding? Log it.';
    case 'afternoon':
      return 'Three hours left. What still needs doing today?';
    case 'evening':
      return 'Evening floor. Affection. Lockbox at 9. Log the day.';
    default:
      return null;
  }
}

export function milestoneMessage(streak) {
  return `${streak} days straight. The campaign is real.`;
}

export function streakBrokenMessage(score) {
  return `Bad day. Score: ${score}. Campaign intact. Back to zero tomorrow.`;
}

export function trendingDownMessage() {
  return "Three days slipping. This is where it turns around or doesn't.";
}

export const MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365];

export function isMilestone(streak) {
  return MILESTONES.includes(streak);
}
