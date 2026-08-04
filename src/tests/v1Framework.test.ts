import { NOTIFICATION_SLOTS } from '@/services/localNotifications';
import type { CheckInStatus, DailyCheckIn, DomainType } from '@/types';
import {
  PRIVATE_ROUTE_TEMPLATES,
  PRODUCT_POSITIONING,
  getAvailableDomains,
  getDomainConfig,
} from '@/types';
import { buildFrameworkRecommendations } from '@/utils/frameworkRecommendations';
import {
  CONNECTION_SUPPORT_OPTIONS,
  buildAccountabilityPrompt,
  buildCatchUpPath,
  buildWeeklyFlywheel,
  getDiscreetDomainLabel,
  getEarlyWakeProtocol,
} from '@/utils/v1Framework';
import { describe, expect, it } from 'vitest';

const OWNER_EMAIL = 'ldgmcdowell@gmail.com';

function checkIn(domainType: DomainType, status: CheckInStatus): DailyCheckIn {
  return {
    id: `${domainType}-${status}`,
    userId: 'user-1',
    cycleId: 'cycle-1',
    date: '2026-08-04',
    domainType,
    status,
    notes: null,
    xpAwarded: status === 'Done' ? 10 : status === 'Partial' ? 5 : 0,
    createdAt: '2026-08-04T00:00:00Z',
    updatedAt: '2026-08-04T00:00:00Z',
  };
}

describe('V1 acceptance framework', () => {
  it('gives an early-wake protocol before the normal start window', () => {
    const protocol = getEarlyWakeProtocol(new Date('2026-08-04T05:10:00'));

    expect(protocol?.title).toBe('Early-wake protocol');
    expect(protocol?.steps).toContain('Water first.');
    expect(protocol?.steps.join(' ')).toContain('return to bed');
  });

  it('does not show the early-wake protocol once the day is underway', () => {
    expect(getEarlyWakeProtocol(new Date('2026-08-04T08:00:00'))).toBeNull();
  });

  it('turns a missed habit into a catch-up path', () => {
    const domains = getAvailableDomains(OWNER_EMAIL);
    const path = buildCatchUpPath(domains, {
      BODY: checkIn('BODY', 'Missed'),
      FUEL: checkIn('FUEL', 'Done'),
    });

    expect(path?.title).toBe('Catch-up path');
    expect(path?.body).toContain('not failed');
    expect(path?.steps.join(' ')).toContain('Partial');
  });

  it('uses Self as the public category while keeping owner private labels coded', () => {
    const meTime = getDomainConfig('METIME', OWNER_EMAIL);
    const usTime = getDomainConfig('USTIME', OWNER_EMAIL);
    const publicSelf = getDomainConfig('METIME', 'user@example.com');

    expect(meTime && getDiscreetDomainLabel(meTime, OWNER_EMAIL)).toBe('MT');
    expect(usTime && getDiscreetDomainLabel(usTime, OWNER_EMAIL)).toBe('UT');
    expect(publicSelf?.label).toBe('Self');
    expect(publicSelf && getDiscreetDomainLabel(publicSelf, 'user@example.com')).toBe('Self');
    expect(publicSelf?.description).toContain('identity');
  });

  it('keeps the top-level framework to Body, Fuel, Self, and Connection for everyone', () => {
    const publicDomains = getAvailableDomains('user@example.com');
    const ownerDomains = getAvailableDomains(OWNER_EMAIL);
    const expected = ['Body', 'Fuel', 'Self', 'Connection'];

    expect(publicDomains.map((domain) => domain.label)).toEqual(expected);
    expect(ownerDomains.map((domain) => domain.label)).toEqual(expected);
    expect(ownerDomains.map((domain) => domain.type)).toEqual(['BODY', 'FUEL', 'METIME', 'USTIME']);
  });

  it('keeps private route templates as subcategories of the main framework', () => {
    expect(PRIVATE_ROUTE_TEMPLATES.map((route) => [route.label, route.parentDomainType])).toEqual([
      ['SHOT', 'USTIME'],
      ['Lens', 'METIME'],
      ['Nest', 'USTIME'],
      ['Roots', 'FUEL'],
    ]);
  });

  it('keeps onboarding and help positioning aligned to the category contract', () => {
    expect(PRODUCT_POSITIONING.headline).toContain('12-week transformation');
    expect(PRODUCT_POSITIONING.what).toContain('guided 84-day operating system');
    expect(PRODUCT_POSITIONING.why).toContain('recovery path');
    expect(PRODUCT_POSITIONING.categoryIntro).toContain('Body, Fuel, Self, and Connection');
  });

  it('uses discreet owner labels in framework recommendation cards', () => {
    const recommendations = buildFrameworkRecommendations({
      email: OWNER_EMAIL,
      domainFocuses: [],
      todayCheckIns: {
        METIME: checkIn('METIME', 'Missed'),
      },
    });

    expect(recommendations[0].title).toBe('Prep MT');
    expect(recommendations[0].domainLabel).toBe('MT');
  });

  it('keeps Us Time connection-first when physical or mood barriers exist', () => {
    expect(CONNECTION_SUPPORT_OPTIONS).toContain(
      'No-mood day: affection stays available without an agenda.',
    );
    expect(CONNECTION_SUPPORT_OPTIONS.join(' ').toLowerCase()).not.toContain('sex');
  });

  it('escalates accountability prompts after ignored cues', () => {
    expect(buildAccountabilityPrompt(0).level).toBe(1);
    expect(buildAccountabilityPrompt(1).level).toBe(2);
    expect(buildAccountabilityPrompt(2).level).toBe(3);
    expect(buildAccountabilityPrompt(2).steps).toContain('Mark Done, Partial, or Missed.');
  });

  it('schedules repeated structured notification prompts', () => {
    expect(NOTIFICATION_SLOTS).toHaveLength(6);
    expect(NOTIFICATION_SLOTS.map((slot) => slot.title)).toEqual([
      'Kairos: early protocol',
      'First prompt',
      'Second prompt',
      'Accountability check',
      'Kairos: catch-up',
      'Kairos: shutdown',
    ]);
  });

  it('builds the same top-level flywheel for Liam and public users', () => {
    const flywheel = buildWeeklyFlywheel({
      email: OWNER_EMAIL,
      today: new Date('2026-08-04T12:00:00'),
      todayCheckIns: {
        BODY: checkIn('BODY', 'Done'),
        FUEL: checkIn('FUEL', 'Done'),
        METIME: checkIn('METIME', 'Partial'),
        USTIME: checkIn('USTIME', 'Partial'),
      },
      checkInHistory: {},
    });

    expect(flywheel.title).toBe('Core flywheel');
    expect(flywheel.entries.map((entry) => entry.label)).toEqual([
      'Body',
      'Fuel',
      'Self',
      'Connection',
    ]);
    expect(flywheel.entries.find((entry) => entry.label === 'Body')?.score).toBe(14);
  });
});
