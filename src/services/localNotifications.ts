import type {
  CheckInStatus,
  CustomRoute,
  CustomRouteCheckIn,
  DailyCheckIn,
  DomainConfig,
  DomainType,
} from '@/types';
import { buildAccountabilityPrompt } from '@/utils/v1Framework';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type ReminderIntensity = 'light' | 'standard' | 'high';
export type NotificationStrategy =
  | 'early'
  | 'small_action'
  | 'reset'
  | 'status_choice'
  | 'rescue'
  | 'tomorrow';

export interface NotificationPreferences {
  enabled: boolean;
  intensity: ReminderIntensity;
  startHour: number;
  endHour: number;
  earlyProtocol: boolean;
  webPushEnabled: boolean;
  pausedDate: string | null;
  revealRouteNames: boolean;
}

export const REMINDER_INTENSITY_OPTIONS: {
  id: ReminderIntensity;
  label: string;
  description: string;
}[] = [
  {
    id: 'light',
    label: 'Gentle',
    description: 'Two check-ins: one start reminder and one chance to catch up.',
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Four reminders: early start, morning, afternoon, and evening.',
  },
  {
    id: 'high',
    label: 'Extra support',
    description:
      'More reminders through the day, plus a smaller option if the first plan is missed.',
  },
];

export const INTENSITY_PREVIEW_COPY: Record<ReminderIntensity, string[]> = {
  light: ['One simple reminder to start.', 'One reminder to catch up before evening.'],
  standard: ['Early start if enabled.', 'Morning, afternoon, and evening reminders in your hours.'],
  high: [
    'If the first reminder is missed, 12K suggests the smallest useful action.',
    'If the day gets messy, choose Done, Part done, Missed, or plan tomorrow.',
    'Quiet hours pause reminders. Action names stay hidden unless you turn them on.',
  ],
};

export interface NotificationOpenItem {
  id: string;
  label: string;
  status?: CheckInStatus;
  privateLabel?: string;
}

export interface NotificationScheduleContext {
  today?: Date;
  openItems?: NotificationOpenItem[];
  lastInteractionAt?: string | Date | null;
}

export interface NotificationScheduleSlot {
  id: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
  strategy: NotificationStrategy;
  deferredFromHour?: number;
  deferredFromMinute?: number;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  intensity: 'standard',
  startHour: 5,
  endHour: 21,
  earlyProtocol: true,
  webPushEnabled: false,
  pausedDate: null,
  revealRouteNames: false,
};

export const NOTIFICATION_SLOTS: NotificationScheduleSlot[] = [
  {
    id: 1,
    hour: 5,
    minute: 0,
    title: 'Kairos: early start',
    body: 'Water. No scrolling. Choose one small action. Rest again if that is the right call.',
    strategy: 'early',
  },
  {
    id: 2,
    hour: 7,
    minute: 30,
    title: buildAccountabilityPrompt(0).title,
    body: buildAccountabilityPrompt(0).body,
    strategy: 'small_action',
  },
  {
    id: 3,
    hour: 12,
    minute: 0,
    title: buildAccountabilityPrompt(1).title,
    body: buildAccountabilityPrompt(1).body,
    strategy: 'reset',
  },
  {
    id: 4,
    hour: 15,
    minute: 0,
    title: buildAccountabilityPrompt(2).title,
    body: buildAccountabilityPrompt(2).body,
    strategy: 'status_choice',
  },
  {
    id: 5,
    hour: 17,
    minute: 0,
    title: 'Kairos: catch up',
    body: 'There is still time. Choose Part done, plan tomorrow, or mark what happened.',
    strategy: 'rescue',
  },
  {
    id: 6,
    hour: 20,
    minute: 30,
    title: 'Kairos: plan tomorrow',
    body: 'Reflect, set tomorrow, finish cleanly.',
    strategy: 'tomorrow',
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
    pausedDate: next.pausedDate ?? null,
    revealRouteNames: !!next.revealRouteNames,
  };
}

export function getLocalNotificationDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isOpenStatus(status?: CheckInStatus): boolean {
  return !status || status === 'Pending' || status === 'Missed';
}

function latestInteractionAt(
  checkIns: Array<DailyCheckIn | CustomRouteCheckIn | undefined>,
): string | null {
  return (
    checkIns
      .map((checkIn) => checkIn?.updatedAt ?? checkIn?.createdAt)
      .filter((date): date is string => !!date)
      .sort()
      .at(-1) ?? null
  );
}

export function buildNotificationScheduleContext({
  domains,
  customRoutes,
  todayCheckIns,
  todayCustomRouteCheckIns,
  revealRouteNames,
}: {
  domains: DomainConfig[];
  customRoutes: CustomRoute[];
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  todayCustomRouteCheckIns: Record<string, CustomRouteCheckIn>;
  revealRouteNames: boolean;
}): NotificationScheduleContext {
  const openDomainItems = domains
    .map<NotificationOpenItem | null>((domain) => {
      const checkIn = todayCheckIns[domain.type];
      if (!isOpenStatus(checkIn?.status)) return null;
      return {
        id: domain.type,
        label: domain.label,
        status: checkIn?.status,
      };
    })
    .filter((item): item is NotificationOpenItem => !!item);

  const openRouteItems = customRoutes
    .filter((route) => !route.archivedAt)
    .map<NotificationOpenItem | null>((route) => {
      const checkIn = todayCustomRouteCheckIns[route.id];
      if (!isOpenStatus(checkIn?.status)) return null;
      return {
        id: route.id,
        label: revealRouteNames ? route.label : 'Extra action',
        privateLabel: route.label,
        status: checkIn?.status,
      };
    })
    .filter((item): item is NotificationOpenItem => !!item);

  return {
    openItems: [...openDomainItems, ...openRouteItems],
    lastInteractionAt: latestInteractionAt([
      ...Object.values(todayCheckIns),
      ...Object.values(todayCustomRouteCheckIns),
    ]),
  };
}

function isWithinAllowedHours(hour: number, startHour: number, endHour: number): boolean {
  if (startHour <= endHour) return hour >= startHour && hour <= endHour;
  return hour >= startHour || hour <= endHour;
}

function deferSlotToAllowedHours(
  slot: NotificationScheduleSlot,
  prefs: NotificationPreferences,
  usedTimes: Set<string>,
): NotificationScheduleSlot {
  if (isWithinAllowedHours(slot.hour, prefs.startHour, prefs.endHour)) {
    usedTimes.add(`${slot.hour}:${slot.minute}`);
    return slot;
  }

  const deferToStart =
    prefs.startHour <= prefs.endHour
      ? slot.hour < prefs.startHour
      : slot.hour > prefs.endHour && slot.hour < prefs.startHour;
  const targetHour = deferToStart ? prefs.startHour : prefs.endHour;
  let targetMinute = deferToStart ? 0 : 55;

  while (
    usedTimes.has(`${targetHour}:${targetMinute}`) &&
    targetMinute >= 0 &&
    targetMinute <= 55
  ) {
    targetMinute += deferToStart ? 5 : -5;
  }

  const minute = Math.min(55, Math.max(0, targetMinute));
  usedTimes.add(`${targetHour}:${minute}`);

  return {
    ...slot,
    hour: targetHour,
    minute,
    deferredFromHour: slot.hour,
    deferredFromMinute: slot.minute,
  };
}

function getSlotTime(today: Date, slot: NotificationScheduleSlot): Date {
  const slotTime = new Date(today);
  slotTime.setHours(slot.hour, slot.minute, 0, 0);
  return slotTime;
}

function parseInteraction(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function applyContextualCopy(
  slot: NotificationScheduleSlot,
  openItems: NotificationOpenItem[] | undefined,
): NotificationScheduleSlot {
  if (!openItems || openItems.length === 0) return slot;
  const first = openItems[0];
  const target = first.label;
  const suffix = openItems.length > 1 ? ` +${openItems.length - 1}` : '';
  const label = `${target}${suffix}`;

  if (slot.strategy === 'small_action') {
    return {
      ...slot,
      body: `${label} is still open. Choose the smallest useful version or mark what happened.`,
    };
  }

  if (slot.strategy === 'rescue') {
    return {
      ...slot,
      body: `${label} can still become Part done. Rescue one piece or set tomorrow.`,
    };
  }

  return slot;
}

export function buildNotificationSchedule(
  preferences: Partial<NotificationPreferences> | null | undefined,
  context: NotificationScheduleContext = {},
): NotificationScheduleSlot[] {
  const prefs = normaliseNotificationPreferences(preferences);
  if (!prefs.enabled) return [];

  const today = context.today ?? new Date();
  const todayKey = getLocalNotificationDateKey(today);
  const pausedToday = prefs.pausedDate === todayKey;
  const lastInteraction = parseInteraction(context.lastInteractionAt);
  const openItems = context.openItems;
  const hasOpenItems = !openItems || openItems.length > 0;
  const ids = new Set(INTENSITY_SLOT_IDS[prefs.intensity]);
  const usedTimes = new Set<string>();

  return NOTIFICATION_SLOTS.filter((slot) => {
    if (pausedToday && slot.strategy !== 'tomorrow') return false;
    if (!ids.has(slot.id)) return false;
    if (slot.id === 1 && !prefs.earlyProtocol) return false;
    if (!hasOpenItems && slot.strategy !== 'tomorrow') return false;
    if (lastInteraction && getLocalNotificationDateKey(lastInteraction) === todayKey) {
      const slotTime = getSlotTime(today, slot);
      if (slot.strategy !== 'tomorrow' && slotTime <= lastInteraction) return false;
    }
    return true;
  })
    .map((slot) => applyContextualCopy(slot, openItems))
    .map((slot) => deferSlotToAllowedHours(slot, prefs, usedTimes));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function scheduleDailyNotifications(
  preferences: Partial<NotificationPreferences> | null | undefined,
  context?: NotificationScheduleContext,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const slots = buildNotificationSchedule(preferences, context);
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
