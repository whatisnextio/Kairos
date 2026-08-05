import { readFileSync } from 'node:fs';
import type { CheckInStatus, DailyCheckIn, DomainType, UserDomainFocus } from '@/types';
import { getDomainConfig } from '@/types';
import { PRIVACY_COPY } from '@/utils/brandCopy';
import { buildFrameworkRecommendations } from '@/utils/frameworkRecommendations';
import {
  buildHealthGuardrailRecommendation,
  buildHealthPatternReflection,
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

function focus(domainType: DomainType, focusDescription: string): UserDomainFocus {
  return {
    id: `focus-${domainType}`,
    userId: 'user-1',
    cycleId: 'cycle-1',
    domainType,
    focusDescription,
    setAt: '2026-08-05T00:00:00Z',
  };
}

describe('Body and Fuel health guardrails', () => {
  it('keeps Body and Fuel starter setup simple and non-diagnostic', () => {
    const body = getDomainConfig('BODY');
    const fuel = getDomainConfig('FUEL');

    expect(body?.focusOptions).toEqual(['Walk for 20 minutes', 'Protect an earlier bedtime']);
    expect(body?.recoveryOptions).toContain('Use an easy walk instead of a session');
    expect(fuel?.focusOptions).toEqual([
      'Drink water before caffeine',
      'Make the next meal protein-first',
    ]);
    expect(fuel?.prepOptions).toContain('Plan the alcohol-free option before evening');
    expect(`${body?.focusOptions.join(' ')} ${fuel?.focusOptions.join(' ')}`).not.toMatch(
      /diagnos/i,
    );
  });

  it('returns calm non-diagnostic signposts for Body and Fuel concerns', () => {
    const bodyGuardrail = buildHealthGuardrailRecommendation(
      'BODY',
      'Pain after a long inactive period',
    );
    const fuelGuardrail = buildHealthGuardrailRecommendation(
      'FUEL',
      'Alcohol and trigger foods keep repeating',
    );
    const copy = `${bodyGuardrail} ${fuelGuardrail}`;

    expect(bodyGuardrail).toContain('lower-intensity');
    expect(bodyGuardrail).toContain('GP or clinician');
    expect(fuelGuardrail).toContain('pattern');
    expect(fuelGuardrail).toContain('appropriate support service');
    expect(copy).not.toMatch(/diagnosis|cure|guaranteed transformation|guarantees/i);
  });

  it('shows repeated symptom and fuel patterns without making medical claims', () => {
    const bodyReflection = buildHealthPatternReflection('BODY', [
      'Knee pain after run',
      'Severe fatigue again',
    ]);
    const fuelReflection = buildHealthPatternReflection('FUEL', [
      'Alcohol made sleep worse',
      'Trigger food and bloating again',
    ]);
    const oneOff = buildHealthPatternReflection('BODY', ['Knee pain once']);
    const copy = `${bodyReflection} ${fuelReflection}`;

    expect(bodyReflection).toContain('A Body pattern is repeating');
    expect(fuelReflection).toContain('A Fuel pattern is repeating');
    expect(oneOff).toBeNull();
    expect(copy).not.toMatch(/diagnosis|cure|guaranteed transformation|guarantees/i);
  });

  it('uses Body health guardrails in Improve recommendations when movement is unsafe to escalate', () => {
    const recommendations = buildFrameworkRecommendations({
      domainFocuses: [focus('BODY', 'Restart exercise after inactivity with knee pain')],
      todayCheckIns: {
        FUEL: checkIn('FUEL', 'Done'),
        METIME: checkIn('METIME', 'Done'),
        USTIME: checkIn('USTIME', 'Done'),
      },
    });

    expect(recommendations[0].domainLabel).toBe('Body');
    expect(recommendations[0].body).toContain('lower-intensity');
    expect(recommendations[0].body).toContain('GP or clinician');
  });

  it('renders health pattern reflections inside Detail without blocking tracking', () => {
    const source = readFileSync('src/pages/DetailScreen.tsx', 'utf8');

    expect(source).toContain('buildHealthPatternReflection');
    expect(source).toContain('Guardrail');
    expect(source).toContain('healthPatternReflection');
    expect(source).toContain('updateDailyCheckInNote');
  });

  it('keeps health-related notes inside user-controlled export and privacy copy', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(source).toContain('Download my data');
    expect(source).toContain('health-related notes you');
    expect(source).toContain(".select('date,domain_type,status,notes,xp_awarded')");
    expect(PRIVACY_COPY.collected).toContain('health-related notes you choose to add');
  });
});
