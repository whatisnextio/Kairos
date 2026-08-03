import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const NOTIFICATION_SLOTS = [
  { id: 1, hour: 5,  minute: 0,  title: '12K — Morning',   body: 'Start strong. Check in when you\'re ready.' },
  { id: 2, hour: 7,  minute: 30, title: '12K — Check in',  body: 'How did the morning go?' },
  { id: 3, hour: 12, minute: 0,  title: '12K — Midday',    body: 'Half the day done. Stay on it.' },
  { id: 4, hour: 17, minute: 0,  title: '12K — Afternoon', body: 'End of the working day. Check in.' },
  { id: 5, hour: 20, minute: 0,  title: '12K — Evening',   body: 'Day nearly done. Log it before you rest.' },
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
    // Ignore errors when cancelling — best effort
  }
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
