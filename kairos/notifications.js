// Kairos notification copy — pure functions, no DOM or native deps.
// Delivery (Capacitor LocalNotifications) lives in delivery.js so these
// message builders stay unit-testable in Node without any browser globals.

export const REMINDERS = [
  { id: 'morning', hour: 6, minute: 30 },
  { id: 'midday', hour: 12, minute: 30 },
  { id: 'evening', hour: 20, minute: 0 },
];

export function morningBrief(yesterdayScore, streak) {
  const score = yesterdayScore == null ? 'not logged' : String(yesterdayScore);
  return `Kairos Score yesterday: ${score}. Streak: ${streak} days. Make today count.`;
}

export function reminderMessage(id, state) {
  switch (id) {
    case 'morning':
      return morningBrief(state.yesterdayScore, state.streak);
    case 'midday':
      return state.loggedToday ? null : 'Nothing logged yet. You know what to do.';
    case 'evening':
      return state.alcoholConfirmedToday ? null : 'One tap. Did you stay clean today?';
    default:
      return null;
  }
}

export function milestoneMessage(streak) {
  return `${streak} days. Don't stop now.`;
}

export function streakBrokenMessage(score) {
  return `Streak reset. Score: ${score}. Start again today. No drama.`;
}

export function trendingDownMessage() {
  return "Three days dropping. This is where it turns around or doesn't.";
}

export const MILESTONES = [7, 14, 30, 60, 100];

export function isMilestone(streak) {
  return MILESTONES.includes(streak);
}
