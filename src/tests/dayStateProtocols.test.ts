import type { CheckInStatus, CustomRoute, DailyCheckIn, DomainType } from '@/types';
import { getAvailableDomains } from '@/types';
import { selectDayStateProtocol } from '@/utils/v1Framework';
import { describe, expect, it } from 'vitest';

const OWNER_EMAIL = 'ldgmcdowell@gmail.com';

function checkIn(domainType: DomainType, status: CheckInStatus): DailyCheckIn {
  return {
    id: `${domainType}-${status}`,
    userId: 'user-1',
    cycleId: 'cycle-1',
    date: '2026-08-05',
    domainType,
    status,
    notes: null,
    xpAwarded: status === 'Done' ? 10 : status === 'Partial' ? 5 : 0,
    createdAt: '2026-08-05T08:00:00Z',
    updatedAt: '2026-08-05T08:00:00Z',
  };
}

function route(overrides: Partial<CustomRoute> = {}): CustomRoute {
  return {
    id: 'route-work',
    userId: 'user-1',
    cycleId: 'cycle-1',
    parentDomainType: 'METIME',
    label: 'Work',
    description: '',
    focusDescription: 'Clear one admin loop',
    createdAt: '2026-08-05T08:00:00Z',
    updatedAt: '2026-08-05T08:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

describe('day-state protocols', () => {
  const domains = getAvailableDomains(OWNER_EMAIL);

  it('selects early wake before the planned start when today has not begun', () => {
    const protocol = selectDayStateProtocol({
      now: new Date('2026-08-05T05:10:00'),
      domains,
      todayCheckIns: {},
    });

    expect(protocol.type).toBe('early_wake');
    expect(protocol.title).toBe('Early start');
    expect(protocol.steps.length).toBeGreaterThanOrEqual(2);
    expect(protocol.steps.length).toBeLessThanOrEqual(4);
  });

  it('selects normal start during the morning with open check-ins', () => {
    const protocol = selectDayStateProtocol({
      now: new Date('2026-08-05T08:30:00'),
      domains,
      todayCheckIns: {},
    });

    expect(protocol.type).toBe('normal_start');
    expect(protocol.title).toBe('Start today');
    expect(protocol.body).toBe('Body is next. Keep it small.');
    expect(protocol.actions.map((action) => action.label)).toContain('Open Body');
  });

  it('selects catch-up after missed or recoverable open actions', () => {
    const protocol = selectDayStateProtocol({
      now: new Date('2026-08-05T13:00:00'),
      domains,
      todayCheckIns: {
        BODY: checkIn('BODY', 'Missed'),
        FUEL: checkIn('FUEL', 'Done'),
      },
    });

    expect(protocol.type).toBe('catch_up');
    expect(protocol.body).toContain('still open');
    expect(protocol.actions.map((action) => action.label)).toContain('Part done');
  });

  it('selects shutdown late in the evening with open domains', () => {
    const protocol = selectDayStateProtocol({
      now: new Date('2026-08-05T20:30:00'),
      domains,
      todayCheckIns: {
        BODY: checkIn('BODY', 'Done'),
      },
    });

    expect(protocol.type).toBe('shutdown');
    expect(protocol.title).toBe('End-of-day check');
    expect(protocol.actions.map((action) => action.label)).toContain('Plan tomorrow');
    expect(protocol.steps.join(' ')).toContain('Plan one small action for tomorrow');
  });

  it('keeps old protocol wording out of user-facing day prompts', () => {
    const source = [
      selectDayStateProtocol({
        now: new Date('2026-08-05T05:10:00'),
        domains,
        todayCheckIns: {},
      }),
      selectDayStateProtocol({
        now: new Date('2026-08-05T08:30:00'),
        domains,
        todayCheckIns: {},
      }),
      selectDayStateProtocol({
        now: new Date('2026-08-05T13:00:00'),
        domains,
        todayCheckIns: { BODY: checkIn('BODY', 'Missed') },
      }),
      selectDayStateProtocol({
        now: new Date('2026-08-05T20:30:00'),
        domains,
        todayCheckIns: { BODY: checkIn('BODY', 'Done') },
      }),
    ]
      .map((protocol) => `${protocol.title} ${protocol.body} ${protocol.steps.join(' ')}`)
      .join(' ');

    expect(source).not.toContain('Shutdown protocol');
    expect(source).not.toContain('Start protocol');
    expect(source).not.toContain('Review protocol');
    expect(source).not.toContain('Catch-up path');
    expect(source).not.toContain('10-minute rescue');
    expect(source).not.toContain('Early-wake protocol');
    expect(source).not.toContain('clean check-in');
  });

  it('escalates after a dismissed protocol without adding a second panel', () => {
    const protocol = selectDayStateProtocol({
      now: new Date('2026-08-05T10:00:00'),
      domains,
      todayCheckIns: {},
      dismissedProtocolId: 'normal-start',
    });

    expect(protocol.id).toBe('catch-up-after-dismiss');
    expect(protocol.title).toBe('Do 10 minutes now');
    expect(protocol.actions.map((action) => action.label)).toContain('Do 10 minutes now');
  });

  it('can target extra actions without changing the four areas', () => {
    const protocol = selectDayStateProtocol({
      now: new Date('2026-08-05T13:00:00'),
      domains,
      todayCheckIns: {
        BODY: checkIn('BODY', 'Done'),
        FUEL: checkIn('FUEL', 'Done'),
        METIME: checkIn('METIME', 'Done'),
        USTIME: checkIn('USTIME', 'Done'),
      },
      customRoutes: [route()],
      todayCustomRouteCheckIns: {},
    });

    expect(protocol.target).toMatchObject({ kind: 'custom_route', routeId: 'route-work' });
    expect(protocol.body).toContain('Work');
    expect(protocol.actions.map((action) => action.kind)).toContain('mark_partial');
  });
});
