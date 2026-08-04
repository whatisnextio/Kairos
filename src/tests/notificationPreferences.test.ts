import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  buildNotificationSchedule,
  normaliseNotificationPreferences,
} from '@/services/localNotifications';
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

  it('respects quiet hours and early protocol preference', () => {
    const slots = buildNotificationSchedule({
      enabled: true,
      intensity: 'high',
      startHour: 7,
      endHour: 17,
      earlyProtocol: false,
    });

    expect(slots.map((s) => s.id)).toEqual([2, 3, 4, 5]);
  });

  it('normalises invalid hour values before scheduling', () => {
    expect(
      normaliseNotificationPreferences({ startHour: -3, endHour: 28, enabled: true }),
    ).toMatchObject({
      startHour: 0,
      endHour: 23,
    });
  });
});
