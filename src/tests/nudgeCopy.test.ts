import type { AiNudge } from '@/types';
import {
  hasPrematureDayCompletionCopy,
  normalisePrematureDayCompletionNudge,
} from '@/utils/nudgeCopy';
import { describe, expect, it } from 'vitest';

function nudge(overrides: Partial<AiNudge> = {}): AiNudge {
  return {
    id: 'nudge-1',
    userId: 'user-1',
    cycleId: 'cycle-1',
    date: '2026-08-05',
    type: 'daily_nudge',
    title: 'Day 1. Close one loop.',
    body: 'Kickoff. Body: walk for ten minutes.',
    domainType: 'BODY',
    kairosPhase: 'KICKOFF',
    xpReward: 5,
    status: 'new',
    cta: 'check_in_now',
    generatedAt: '2026-08-05T09:00:00.000Z',
    ...overrides,
  };
}

describe('nudge copy timing guard', () => {
  it('detects premature day-complete language', () => {
    expect(hasPrematureDayCompletionCopy('Day 1 done. Now make it two.')).toBe(true);
    expect(hasPrematureDayCompletionCopy('Today is complete.', 'Start tomorrow clean.')).toBe(true);
    expect(hasPrematureDayCompletionCopy('First action logged.', 'Keep the next one small.')).toBe(
      false,
    );
  });

  it('keeps cached AI nudges from saying the day is done early', () => {
    const unsafe = nudge({
      title: 'Day 1 done. Now make it two.',
      body: 'You closed today. Push again tomorrow.',
      domainType: 'FUEL',
    });
    const fallback = nudge({
      id: 'fallback-1',
      title: 'Day 1. Close one loop.',
      body: 'Kickoff. Fuel: drink water before caffeine.',
      domainType: 'FUEL',
    });

    const normalised = normalisePrematureDayCompletionNudge(unsafe, fallback);

    expect(normalised.id).toBe('nudge-1');
    expect(normalised.title).toBe('Day 1. Close one loop.');
    expect(normalised.body).toContain('drink water before caffeine');
    expect(normalised.domainType).toBe('FUEL');
  });
});
