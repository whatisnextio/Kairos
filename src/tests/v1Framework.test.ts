import { NOTIFICATION_SLOTS } from '@/services/localNotifications';
import type { CheckInStatus, DailyCheckIn, DomainType } from '@/types';
import {
  IDENTITY_ANCHORS,
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
  getDailyDomainLabel,
  getEarlyWakeProtocol,
  selectDayStateProtocol,
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

    expect(protocol?.title).toBe('Early start');
    expect(protocol?.steps).toContain('Water first.');
    expect(protocol?.steps.join(' ')).toContain('return to bed');
  });

  it('does not show the early-wake protocol once the day is underway', () => {
    expect(getEarlyWakeProtocol(new Date('2026-08-04T08:00:00'))).toBeNull();
  });

  it('shows catch-up path for a pending domain', () => {
    const domains = getAvailableDomains(OWNER_EMAIL);
    const path = buildCatchUpPath(domains, {
      FUEL: checkIn('FUEL', 'Done'),
      METIME: checkIn('METIME', 'Done'),
      USTIME: checkIn('USTIME', 'Done'),
      // BODY is absent (Pending)
    });

    expect(path?.title).toBe('Choose one check-in');
    expect(path?.body).toContain('easiest open item');
    expect(path?.steps.join(' ')).toContain('Part done');
  });

  it('does not show catch-up path when all domains are explicitly marked', () => {
    const domains = getAvailableDomains(OWNER_EMAIL);
    const path = buildCatchUpPath(domains, {
      BODY: checkIn('BODY', 'Missed'),
      FUEL: checkIn('FUEL', 'Done'),
      METIME: checkIn('METIME', 'Partial'),
      USTIME: checkIn('USTIME', 'Done'),
    });

    expect(path).toBeNull();
  });

  it('uses Self and Connection as the public categories for everyone', () => {
    const self = getDomainConfig('METIME', OWNER_EMAIL);
    const connection = getDomainConfig('USTIME', OWNER_EMAIL);
    const publicSelf = getDomainConfig('METIME', 'user@example.com');

    expect(self && getDailyDomainLabel(self)).toBe('Self');
    expect(connection && getDailyDomainLabel(connection)).toBe('Connection');
    expect(publicSelf?.label).toBe('Self');
    expect(publicSelf?.description).toContain('feeling steady');
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

  it('keeps Liam setup route focuses coded and action-shaped', () => {
    const combinedFocusCopy = PRIVATE_ROUTE_TEMPLATES.map((route) => route.focusDescription)
      .join(' ')
      .toLowerCase();

    expect(PRIVATE_ROUTE_TEMPLATES.every((route) => route.focusDescription)).toBe(true);
    expect(combinedFocusCopy).toContain('one visible move');
    expect(combinedFocusCopy).toContain('one photo action');
    expect(combinedFocusCopy).toContain('one present family action');
    expect(combinedFocusCopy).not.toContain('sex');
    expect(combinedFocusCopy).not.toContain('masturb');
  });

  it('keeps onboarding and help positioning aligned to the category contract', () => {
    expect(PRODUCT_POSITIONING.headline).toContain('12-week transformation');
    expect(PRODUCT_POSITIONING.what).toContain('guided 12-week plan');
    expect(PRODUCT_POSITIONING.kairosMeaning).toContain('Greek');
    expect(PRODUCT_POSITIONING.kairosMeaning).toContain('opportune moment');
    expect(PRODUCT_POSITIONING.kairosMeaning).not.toMatch(/latin|implement/i);
    expect(PRODUCT_POSITIONING.audience).toContain('It is for everyone');
    expect(PRODUCT_POSITIONING.audience).not.toMatch(/\bmen\b|\bman\b|male/i);
    expect(PRODUCT_POSITIONING.why).toContain('simple reminders');
    expect(PRODUCT_POSITIONING.why).toContain('way back');
    expect(PRODUCT_POSITIONING.categoryIntro).toContain('Body, Fuel, Self, and Connection');
    expect(PRODUCT_POSITIONING.proofLoop).toContain('review the week');
    expect(PRODUCT_POSITIONING.audience).not.toContain('gender-specific programme');
  });

  it('keeps identity anchors distinct and plain-English', () => {
    const anchorNames = IDENTITY_ANCHORS.map((anchor) => anchor.name);
    const descriptions = IDENTITY_ANCHORS.map((anchor) => anchor.description);
    const provider = IDENTITY_ANCHORS.find((anchor) => anchor.id === 'provider');
    const builder = IDENTITY_ANCHORS.find((anchor) => anchor.id === 'builder');
    const guardian = IDENTITY_ANCHORS.find((anchor) => anchor.id === 'guardian');
    const custom = IDENTITY_ANCHORS.find((anchor) => anchor.id === 'custom');

    expect(new Set(anchorNames).size).toBe(IDENTITY_ANCHORS.length);
    expect(new Set(descriptions).size).toBe(IDENTITY_ANCHORS.length);
    expect(anchorNames).toEqual(
      expect.arrayContaining(['Gentle', 'Practical', 'Direct', 'Custom']),
    );
    expect(provider?.description).toContain('calm support');
    expect(builder?.description).toContain('next small step');
    expect(guardian?.description).toContain('firmer push');
    expect(anchorNames.join(' ')).not.toMatch(/The Provider|The Builder|The Guardian/i);
    expect(custom?.description).toContain('own words');
  });

  it('uses clear category labels in framework recommendation cards', () => {
    const recommendations = buildFrameworkRecommendations({
      email: OWNER_EMAIL,
      domainFocuses: [],
      todayCheckIns: {
        METIME: checkIn('METIME', 'Missed'),
      },
    });

    expect(recommendations[0].title).toBe('Prep Self');
    expect(recommendations[0].domainLabel).toBe('Self');
  });

  it('keeps Connection comfort-first when physical or mood barriers exist', () => {
    expect(CONNECTION_SUPPORT_OPTIONS).toContain(
      'Overloaded day: practical help first, conversation second.',
    );
    expect(CONNECTION_SUPPORT_OPTIONS.join(' ')).not.toMatch(
      /sex|sexual|intimacy|intimate|closeness|affection/i,
    );
  });

  it('escalates accountability prompts after ignored cues', () => {
    expect(buildAccountabilityPrompt(0).level).toBe(1);
    expect(buildAccountabilityPrompt(1).level).toBe(2);
    expect(buildAccountabilityPrompt(2).level).toBe(3);
    expect(buildAccountabilityPrompt(1).body.toLowerCase()).not.toContain('ignored');
    expect(buildAccountabilityPrompt(2).title).toBe('End-of-day check');
    expect(buildAccountabilityPrompt(2).body).toContain('A smaller useful version still counts');
    expect(buildAccountabilityPrompt(2).body).not.toContain('not another task');
    expect(buildAccountabilityPrompt(2).steps).toContain('Mark Done, Part done, or Missed.');
    expect(buildAccountabilityPrompt(1).steps).toContain('Record what happened.');
  });

  it('makes evening check-in the primary Home action when an area is open', () => {
    const protocol = selectDayStateProtocol({
      now: new Date('2026-08-04T20:15:00'),
      domains: getAvailableDomains(OWNER_EMAIL),
      todayCheckIns: {
        BODY: checkIn('BODY', 'Done'),
      },
    });

    expect(protocol.id).toBe('shutdown');
    expect(protocol.body).toBe('Fuel is still open. Check in now or set up tomorrow.');
    expect(protocol.actions.map((action) => action.label)).toEqual([
      'Check in Fuel',
      'Plan tomorrow',
      'Not now',
    ]);
    expect(protocol.steps).toEqual([
      'Choose Done, Part done, or Missed.',
      'Plan one small action for tomorrow.',
    ]);
  });

  it('schedules repeated structured notification prompts', () => {
    expect(NOTIFICATION_SLOTS).toHaveLength(6);
    expect(NOTIFICATION_SLOTS.map((slot) => slot.title)).toEqual([
      'Kairos: early start',
      'Still open',
      'Quick reset',
      'End-of-day check',
      'Kairos: catch up',
      'Kairos: plan tomorrow',
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

    expect(flywheel.title).toBe('Weekly pattern');
    expect(flywheel.entries.map((entry) => entry.label)).toEqual([
      'Body',
      'Fuel',
      'Self',
      'Connection',
    ]);
    expect(flywheel.entries.find((entry) => entry.label === 'Body')?.score).toBe(14);
  });
});
