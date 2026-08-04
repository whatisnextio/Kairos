import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  REMINDER_INTENSITY_OPTIONS,
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

  it('explains each onboarding intensity without diagnostic language', () => {
    expect(REMINDER_INTENSITY_OPTIONS.map((option) => option.id)).toEqual([
      'light',
      'standard',
      'high',
    ]);
    expect(
      REMINDER_INTENSITY_OPTIONS.find((option) => option.id === 'high')?.description,
    ).toContain('Repeated structured prompts');
    expect(REMINDER_INTENSITY_OPTIONS.map((option) => option.description).join(' ')).not.toMatch(
      /adhd|diagnos/i,
    );
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
