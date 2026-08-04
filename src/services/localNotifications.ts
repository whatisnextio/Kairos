import { buildAccountabilityPrompt } from '@/utils/v1Framework';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type ReminderIntensity = 'light' | 'standard' | 'high';

export interface NotificationPreferences {
  enabled: boolean;
  intensity: ReminderIntensity;
  startHour: number;
  endHour: number;
  earlyProtocol: boolean;
  webPushEnabled: boolean;
}

export const REMINDER_INTENSITY_OPTIONS: {
  id: ReminderIntensity;
  label: string;
  description: string;
}[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Two check-ins: one useful prompt and one catch-up path.',
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Four prompts across early protocol, start, end-of-day check, and shutdown.',
  },
  {
    id: 'high',
    label: 'High accountability',
    description: 'Repeated structured prompts through the day so missed cues stay visible.',
  },
];

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  intensity: 'standard',
  startHour: 5,
  endHour: 21,
  earlyProtocol: true,
  webPushEnabled: false,
};

export const NOTIFICATION_SLOTS = [
  {
    id: 1,
    hour: 5,
    minute: 0,
    title: 'Kairos: early protocol',
    body: 'Water. No scrolling. Choose one small action. Rest again if that is the right call.',
  },
  {
    id: 2,
    hour: 7,
    minute: 30,
    title: buildAccountabilityPrompt(0).title,
    body: buildAccountabilityPrompt(0).body,
  },
  {
    id: 3,
    hour: 12,
    minute: 0,
    title: buildAccountabilityPrompt(1).title,
    body: buildAccountabilityPrompt(1).body,
  },
  {
    id: 4,
    hour: 15,
    minute: 0,
    title: buildAccountabilityPrompt(2).title,
    body: buildAccountabilityPrompt(2).body,
  },
  {
    id: 5,
    hour: 17,
    minute: 0,
    title: 'Kairos: catch-up',
    body: 'There is still time. Mark Partial, protect tomorrow, finish one useful action.',
  },
  {
    id: 6,
    hour: 20,
    minute: 30,
    title: 'Kairos: shutdown',
    body: 'Reflect, set tomorrow, finish cleanly.',
  },
];

const INTENSITY_SLOT_IDS: Record<ReminderIntensity, number[]> = {
  light: [2, 5],
  standard: [1, 2, 4, 6],
  high: [1, 2, 3, 4, 5, 6],
};

export function normaliseNotificationPreferences(
  preferences: Partial<NotificationPreferences> | null | undefined,
): NotificationPreferences {
  const next = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(preferences ?? {}) };
  return {
    ...next,
    startHour: Math.min(23, Math.max(0, Math.round(next.startHour))),
    endHour: Math.min(23, Math.max(0, Math.round(next.endHour))),
  };
}

export function buildNotificationSchedule(
  preferences: Partial<NotificationPreferences> | null | undefined,
) {
  const prefs = normaliseNotificationPreferences(preferences);
  if (!prefs.enabled) return [];

  const ids = new Set(INTENSITY_SLOT_IDS[prefs.intensity]);
  return NOTIFICATION_SLOTS.filter((slot) => {
    if (!ids.has(slot.id)) return false;
    if (slot.id === 1 && !prefs.earlyProtocol) return false;
    if (slot.hour < prefs.startHour || slot.hour > prefs.endHour) return false;
    return true;
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function scheduleDailyNotifications(
  preferences: Partial<NotificationPreferences> | null | undefined,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const slots = buildNotificationSchedule(preferences);
  if (slots.length === 0) {
    await cancelDailyNotifications();
    return;
  }

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return;

  // Cancel any existing scheduled notifications before rescheduling
  await cancelDailyNotifications();

  await LocalNotifications.schedule({
    notifications: slots.map((slot) => ({
      id: slot.id,
      title: slot.title,
      body: slot.body,
      extra: {
        url: slot.id === 6 ? '/#/improve' : '/#/',
      },
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
