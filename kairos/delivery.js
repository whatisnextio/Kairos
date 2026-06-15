// Kairos — Capacitor notification delivery.
// @capacitor/local-notifications schedules at the OS level so notifications
// fire at 06:30 / 12:30 / 20:00 even when the app is fully closed or the
// screen is locked. Falls back to the Notification API on the web build.

import { LocalNotifications } from '@capacitor/local-notifications';
import { morningBrief } from './notifications.js';

// Permission state is async on native; we cache it so UI can read synchronously.
let _permission = 'default';

export function permission() {
  return _permission;
}

// Create Android notification channels (required for Android 8+).
// Called once on app boot before any scheduling.
export async function initChannels() {
  try {
    await LocalNotifications.createChannel({
      id: 'kairos-reminders',
      name: 'Daily reminders',
      description: 'Morning, midday, and evening check-in nudges',
      importance: 4,
      visibility: 1,
      vibration: true,
      sound: null,
    });
    await LocalNotifications.createChannel({
      id: 'kairos-events',
      name: 'Milestones & alerts',
      description: 'Streak milestones, broken streaks, and trend alerts',
      importance: 3,
      visibility: 1,
      vibration: false,
      sound: null,
    });
  } catch { /* non-Android platforms return an error — safe to ignore */ }
}

export async function checkPermission() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    _permission =
      display === 'granted' ? 'granted'
      : display === 'denied' ? 'denied'
      : 'default';
  } catch {
    _permission =
      typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  }
  return _permission;
}

export async function requestPermission() {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    _permission = display === 'granted' ? 'granted' : 'denied';
  } catch {
    if (typeof Notification !== 'undefined') {
      _permission = await Notification.requestPermission();
    } else {
      _permission = 'denied';
    }
  }
  return _permission;
}

// ─── Scheduled reminders ──────────────────────────────────────────────────────

// Pre-schedule this many days ahead. Re-run each time the app comes into view.
const SCHEDULE_DAYS = 7;
// IDs 1–99 are reserved for event-driven (immediate) notifications.
const SCHED_ID_START = 100;

/**
 * Cancel all pending scheduled reminders then rebuild the next SCHEDULE_DAYS
 * days. Call after save and on every visibility-change.
 */
export async function scheduleReminders(state) {
  if (_permission !== 'granted') return;
  try {
    await _cancelScheduled();
    const notifications = _buildSchedule(state);
    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch { /* notifications are best-effort — never crash the app */ }
}

export async function cancelReminders() {
  try {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length > 0) {
      await LocalNotifications.cancel({ notifications });
    }
  } catch { /* best effort */ }
}

async function _cancelScheduled() {
  const { notifications } = await LocalNotifications.getPending();
  const scheduled = notifications.filter((n) => n.id >= SCHED_ID_START);
  if (scheduled.length > 0) {
    await LocalNotifications.cancel({ notifications: scheduled });
  }
}

function _buildSchedule(state) {
  const now = new Date();
  const out = [];
  let id = SCHED_ID_START;

  for (let d = 0; d < SCHEDULE_DAYS; d++) {
    const isToday = d === 0;

    const morning = _dayAt(d, 6, 30);
    if (morning > now) {
      out.push(_notif(id++,
        isToday
          ? morningBrief(state.yesterdayScore, state.streak)
          : 'Make today count.',
        morning));
    }

    const midday = _dayAt(d, 12, 30);
    if (midday > now && (!isToday || !state.loggedToday)) {
      out.push(_notif(id++, 'Nothing logged yet. You know what to do.', midday));
    }

    const evening = _dayAt(d, 20, 0);
    if (evening > now && (!isToday || !state.alcoholConfirmedToday)) {
      out.push(_notif(id++, 'One tap. Did you stay clean today?', evening));
    }
  }

  return out;
}

function _dayAt(daysAhead, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function _notif(id, body, at) {
  return {
    id,
    title: 'Kairos',
    body,
    schedule: { at, allowWhileIdle: true },
    smallIcon: 'ic_stat_kairos',
    iconColor: '#ff5a00',
    channelId: 'kairos-reminders',
  };
}

// ─── Event-driven (milestone, streak broken, trending down) ───────────────────

const TAG_IDS = { milestone: 1, 'streak-broken': 2, 'trending-down': 3 };

export async function notify(title, body, tag) {
  if (_permission !== 'granted') return false;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: TAG_IDS[tag] ?? 99,
        title,
        body,
        schedule: { at: new Date(Date.now() + 300) },
        smallIcon: 'ic_stat_kairos',
        iconColor: '#ff5a00',
        channelId: 'kairos-events',
      }],
    });
    return true;
  } catch {
    return false;
  }
}
