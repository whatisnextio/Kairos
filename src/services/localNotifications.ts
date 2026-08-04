import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFICATION_SLOTS = [
  {
    id: 1,
    hour: 5,
    minute: 0,
    title: '12K: Start',
    body: 'Choose the first action before the day chooses for you.',
  },
  {
    id: 2,
    hour: 7,
    minute: 30,
    title: '12K: Body/Fuel',
    body: 'Move, hydrate, or set the next meal. One useful action.',
  },
  {
    id: 3,
    hour: 12,
    minute: 0,
    title: '12K: Reset',
    body: 'Midday drift check. Pick one domain and close it.',
  },
  {
    id: 4,
    hour: 15,
    minute: 0,
    title: '12K: Nudge',
    body: 'What is slipping? Make it visible before it becomes the day.',
  },
  {
    id: 5,
    hour: 17,
    minute: 0,
    title: '12K: Line',
    body: 'End the work block cleanly. Log the honest status.',
  },
  {
    id: 6,
    hour: 20,
    minute: 30,
    title: '12K: Shutdown',
    body: 'Reflect, plan tomorrow, close the loop.',
  },
];

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function scheduleDailyNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return;

  // Cancel any existing scheduled notifications before rescheduling
  await cancelDailyNotifications();

  await LocalNotifications.schedule({
    notifications: NOTIFICATION_SLOTS.map((slot) => ({
      id: slot.id,
      title: slot.title,
      body: slot.body,
      schedule: {
        every: 'day' as const,
        on: { hour: slot.hour, minute: slot.minute },
        allowWhileIdle: true,
      },
      sound: undefined,
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#00ff87',
    })),
  });
}

export async function cancelDailyNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications.filter((n) =>
      NOTIFICATION_SLOTS.some((slot) => slot.id === n.id),
    );
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch {
    // Ignore errors when cancelling, best effort
  }
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
