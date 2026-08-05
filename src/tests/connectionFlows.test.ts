import { readFileSync } from 'node:fs';
import { NOTIFICATION_SLOTS } from '@/services/localNotifications';
import type { CheckInStatus, DailyCheckIn, DomainType, UserDomainFocus } from '@/types';
import { buildFrameworkRecommendations } from '@/utils/frameworkRecommendations';
import {
  CONNECTION_CONTEXT_OPTIONS,
  buildConnectionFocusDescription,
  buildConnectionRecommendation,
  getConnectionContextOptions,
} from '@/utils/v1Framework';
import { describe, expect, it } from 'vitest';

function checkIn(domainType: DomainType, status: CheckInStatus): DailyCheckIn {
  return {
    id: `${domainType}-${status}`,
    userId: 'user-1',
    cycleId: 'cycle-1',
    date: '2026-08-05',
    domainType,
    status,
    notes: null,
    xpAwarded: status === 'Done' ? 25 : status === 'Partial' ? 10 : 0,
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  };
}

function focus(focusDescription: string): UserDomainFocus {
  return {
    id: 'focus-connection',
    userId: 'user-1',
    cycleId: 'cycle-1',
    domainType: 'USTIME',
    focusDescription,
    setAt: '2026-08-05T00:00:00Z',
  };
}

describe('Connection comfort-first flows', () => {
  it('offers recipient and context selection in both setup surfaces', () => {
    const detail = readFileSync('src/pages/DetailScreen.tsx', 'utf8');
    const modal = readFileSync('src/components/modals/ProgressiveDomainSetupModal.tsx', 'utf8');
    const setupSource = `${detail}\n${modal}`;

    expect(setupSource).toContain('Who is this for?');
    expect(setupSource).toContain('What helps today?');
    expect(setupSource).toContain('CONNECTION_RECIPIENT_OPTIONS');
    expect(setupSource).toContain('getConnectionContextOptions');
    expect(setupSource).toContain('min-h-11');
  });

  it('keeps comfort-first partner options before consent-led closeness', () => {
    const ids = CONNECTION_CONTEXT_OPTIONS.map((option) => option.id);

    expect(ids).toContain('comfort_first');
    expect(ids.indexOf('comfort_first')).toBeLessThan(ids.indexOf('consent_led_closeness'));
  });

  it('filters partner-only context out of family and friend setup', () => {
    const familyIds = getConnectionContextOptions('family').map((option) => option.id);
    const friendIds = getConnectionContextOptions('friend').map((option) => option.id);

    expect(familyIds).toContain('family_presence');
    expect(familyIds).not.toContain('consent_led_closeness');
    expect(friendIds).not.toContain('consent_led_closeness');
    expect(friendIds).not.toContain('comfort_first');
  });

  it('turns partner discomfort states into comfort-first recommendations', () => {
    const partnerFocus = buildConnectionFocusDescription('partner', 'comfort_first');
    const recommendation = buildConnectionRecommendation(partnerFocus);

    expect(partnerFocus).toContain('Pain, tiredness, cycle symptoms, low mood');
    expect(recommendation).toContain('comfort');
    expect(recommendation).toContain('practical help');
    expect(recommendation).toContain('consent-led presence');
  });

  it('keeps family and friend recommendations away from partner-specific closeness copy', () => {
    const familyRecommendation = buildConnectionRecommendation(
      buildConnectionFocusDescription('family', 'family_presence'),
    );
    const friendRecommendation = buildConnectionRecommendation(
      buildConnectionFocusDescription('friend', 'conversation'),
    );
    const combined = `${familyRecommendation} ${friendRecommendation}`;

    expect(familyRecommendation).toContain('presence action');
    expect(friendRecommendation).toContain('low-pressure check-in');
    expect(combined).not.toMatch(/partner|consent-led|closeness|intimacy|sex/i);
  });

  it('uses comfort-first Connection copy in Improve recommendations', () => {
    const recommendations = buildFrameworkRecommendations({
      domainFocuses: [focus(buildConnectionFocusDescription('partner', 'comfort_first'))],
      todayCheckIns: {
        BODY: checkIn('BODY', 'Done'),
        FUEL: checkIn('FUEL', 'Done'),
        METIME: checkIn('METIME', 'Done'),
      },
    });

    expect(recommendations[0].domainLabel).toBe('Connection');
    expect(recommendations[0].body).toContain('comfort');
    expect(recommendations[0].body).toContain('practical help');
    expect(recommendations[0].body).not.toMatch(/sex|wife|husband|intimacy/i);
  });

  it('keeps generated Connection labels and notification copy discreet', () => {
    const generatedLabels = [
      buildConnectionFocusDescription('partner', 'comfort_first'),
      buildConnectionFocusDescription('family', 'family_presence'),
      buildConnectionFocusDescription('friend', 'conversation'),
      buildConnectionFocusDescription('community', 'practical_help'),
    ].join(' ');
    const notificationCopy = NOTIFICATION_SLOTS.map((slot) => `${slot.title} ${slot.body}`).join(
      ' ',
    );

    expect(generatedLabels).not.toMatch(/sex|wife|husband|intimacy/i);
    expect(notificationCopy).not.toMatch(/sex|wife|husband|intimacy/i);
  });
});
