// Notifications are the accountability layer. The copy is blunt by design: no
// emojis, no encouragement fluff, just the fact (see the V2MOM).
//
// Phase 1 reality check: a no-backend PWA cannot reliably fire notifications
// while it is closed. This module does best-effort local delivery while the app
// is open (or running in the background tab) and shows event-driven alerts the
// moment a condition is detected. True scheduled background delivery needs
// Phase 2 (Garmin sync + push / FCM). The message builders below are pure so
// they can be unit tested.

export const REMINDERS = [
  { id: 'morning', hour: 6, minute: 30 },
  { id: 'midday', hour: 12, minute: 30 },
  { id: 'evening', hour: 20, minute: 0 },
];

/** Morning brief copy. */
export function morningBrief(yesterdayScore, streak) {
  const score = yesterdayScore == null ? 'not logged' : String(yesterdayScore);
  return `Kairos Score yesterday: ${score}. Streak: ${streak} days. Make today count.`;
}

/** Build the message for a timed reminder given today's state. Null = skip it. */
export function reminderMessage(id, state) {
  switch (id) {
    case 'morning':
      return morningBrief(state.yesterdayScore, state.streak);
    case 'midday':
      // Only nag if nothing is logged yet today.
      return state.loggedToday ? null : 'Nothing logged yet. You know what to do.';
    case 'evening':
      // Only nag if the alcohol tap has not been confirmed today.
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

// ─── Browser-side delivery (guarded so the module still imports under Node) ───

export function supported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission() {
  return supported() ? Notification.permission : 'denied';
}

export async function requestPermission() {
  if (!supported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Show a notification via the service worker when possible, else directly. */
export async function notify(title, body, tag) {
  if (!supported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) {
      await reg.showNotification(title, { body, tag, badge: 'icon-192.png', icon: 'icon-192.png' });
    } else {
      // eslint-disable-next-line no-new
      new Notification(title, { body, tag });
    }
    return true;
  } catch {
    return false;
  }
}
