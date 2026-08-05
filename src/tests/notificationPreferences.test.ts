import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  INTENSITY_PREVIEW_COPY,
  REMINDER_INTENSITY_OPTIONS,
  buildNotificationSchedule,
  buildNotificationScheduleContext,
  getLocalNotificationDateKey,
  normaliseNotificationPreferences,
} from '@/services/localNotifications';
import type { CustomRoute } from '@/types';
import { describe, expect, it } from 'vitest';

describe('notification preferences', () => {
  it('does not schedule reminders when disabled', () => {
    expect(buildNotificationSchedule(DEFAULT_NOTIFICATION_PREFERENCES)).toEqual([]);
  });

  it('maps intensity to a bounded reminder schedule', () => {
    expect(
      buildNotificationSchedule({ enabled: true, intensity: 'light' }).map((s) => s.id),
    ).toEqual([2, 5]);
    expect(
      buildNotificationSchedule({ enabled: true, intensity: 'standard' }).map((s) => s.id),
    ).toEqual([1, 2, 4, 6]);
    expect(
      buildNotificationSchedule({ enabled: true, intensity: 'high' }).map((s) => s.id),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('explains each onboarding intensity without diagnostic language before permission', () => {
    expect(REMINDER_INTENSITY_OPTIONS.map((option) => option.id)).toEqual([
      'light',
      'standard',
      'high',
    ]);
    expect(REMINDER_INTENSITY_OPTIONS.find((option) => option.id === 'light')?.label).toBe(
      'Gentle',
    );
    expect(
      REMINDER_INTENSITY_OPTIONS.find((option) => option.id === 'high')?.description,
    ).toContain('opted-in ladder');
    expect(INTENSITY_PREVIEW_COPY.high).toHaveLength(3);
    expect(REMINDER_INTENSITY_OPTIONS.map((option) => option.description).join(' ')).not.toMatch(
      /adhd|diagnos/i,
    );
  });

  it('respects quiet hours by deferring rather than dropping ladder prompts', () => {
    const slots = buildNotificationSchedule({
      enabled: true,
      intensity: 'high',
      startHour: 7,
      endHour: 17,
      earlyProtocol: true,
    });

    expect(slots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(slots.find((slot) => slot.id === 1)).toMatchObject({
      hour: 7,
      minute: 0,
      deferredFromHour: 5,
    });
    expect(slots.find((slot) => slot.id === 6)).toMatchObject({
      hour: 17,
      minute: 55,
      deferredFromHour: 20,
    });
  });

  it('lets early start remain optional', () => {
    const slots = buildNotificationSchedule({
      enabled: true,
      intensity: 'high',
      startHour: 7,
      endHour: 17,
      earlyProtocol: false,
    });

    expect(slots.map((s) => s.id)).toEqual([2, 3, 4, 5, 6]);
  });

  it('normalises invalid hour values before scheduling', () => {
    expect(
      normaliseNotificationPreferences({ startHour: -3, endHour: 28, enabled: true }),
    ).toMatchObject({
      startHour: 0,
      endHour: 23,
    });
  });

  it('uses open status and last interaction when building the schedule', () => {
    const today = new Date('2026-08-05T09:00:00');
    const slots = buildNotificationSchedule(
      { enabled: true, intensity: 'high' },
      {
        today,
        lastInteractionAt: '2026-08-05T12:15:00.000Z',
        openItems: [{ id: 'BODY', label: 'Body', status: 'Pending' }],
      },
    );

    expect(slots.map((slot) => slot.id)).toEqual([4, 5, 6]);
    expect(new Set(slots.map((slot) => slot.strategy)).size).toBeGreaterThanOrEqual(3);
  });

  it('keeps route names private unless the user opts in', () => {
    const route: CustomRoute = {
      id: 'route-money',
      userId: 'user-1',
      cycleId: 'cycle-1',
      parentDomainType: 'METIME',
      label: 'Money',
      description: '',
      focusDescription: 'Clear the account admin',
      createdAt: '2026-08-05T06:00:00.000Z',
      updatedAt: '2026-08-05T06:00:00.000Z',
      archivedAt: null,
    };

    const privateContext = buildNotificationScheduleContext({
      domains: [],
      customRoutes: [route],
      todayCheckIns: {},
      todayCustomRouteCheckIns: {},
      revealRouteNames: false,
    });
    const privateCopy = buildNotificationSchedule(
      { enabled: true, intensity: 'high' },
      privateContext,
    )
      .map((slot) => slot.body)
      .join(' ');

    const namedContext = buildNotificationScheduleContext({
      domains: [],
      customRoutes: [route],
      todayCheckIns: {},
      todayCustomRouteCheckIns: {},
      revealRouteNames: true,
    });
    const namedCopy = buildNotificationSchedule({ enabled: true, intensity: 'high' }, namedContext)
      .map((slot) => slot.body)
      .join(' ');

    expect(privateCopy).toContain('Personal route');
    expect(privateCopy).not.toContain('Money');
    expect(namedCopy).toContain('Money');
  });

  it('pauses escalation for today without disabling the saved preference', () => {
    const today = new Date('2026-08-05T08:00:00');
    const slots = buildNotificationSchedule(
      {
        enabled: true,
        intensity: 'high',
        pausedDate: getLocalNotificationDateKey(today),
      },
      { today, openItems: [{ id: 'BODY', label: 'Body' }] },
    );

    expect(slots.map((slot) => slot.id)).toEqual([6]);
    expect(normaliseNotificationPreferences({ pausedDate: '2026-08-05' })).toMatchObject({
      pausedDate: '2026-08-05',
      intensity: 'standard',
    });
  });
});
