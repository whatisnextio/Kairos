import {
  KAIROS_PHASES,
  getCurrentPhase,
  getCurrentPhaseConfig,
  getCycleProgressPct,
  getDayInCycle,
  getPhaseProgressPct,
  isCycleComplete,
} from '@/utils/kairos';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('getDayInCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 1 on the start date', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    expect(getDayInCycle('2024-01-01')).toBe(1);
  });

  it('returns 14 on day 14', () => {
    vi.setSystemTime(new Date('2024-01-14'));
    expect(getDayInCycle('2024-01-01')).toBe(14);
  });

  it('returns 365 on the last day', () => {
    vi.setSystemTime(new Date('2024-12-31')); // 365 days after 2024-01-01
    expect(getDayInCycle('2024-01-01')).toBe(366); // 2024 is a leap year; campaign ends on day 365 regardless
  });

  it('never returns less than 1', () => {
    vi.setSystemTime(new Date('2023-12-31'));
    expect(getDayInCycle('2024-01-01')).toBe(1);
  });
});

describe('getCurrentPhaseConfig', () => {
  it('returns GATE for day 1', () => {
    expect(getCurrentPhaseConfig(1).phase).toBe('GATE');
  });

  it('returns GATE for day 7', () => {
    expect(getCurrentPhaseConfig(7).phase).toBe('GATE');
  });

  it('returns STABILISE for day 8', () => {
    expect(getCurrentPhaseConfig(8).phase).toBe('STABILISE');
  });

  it('returns STABILISE for day 56', () => {
    expect(getCurrentPhaseConfig(56).phase).toBe('STABILISE');
  });

  it('returns BUILD for day 57', () => {
    expect(getCurrentPhaseConfig(57).phase).toBe('BUILD');
  });

  it('returns BUILD for day 151', () => {
    expect(getCurrentPhaseConfig(151).phase).toBe('BUILD');
  });

  it('returns PERFORM for day 152', () => {
    expect(getCurrentPhaseConfig(152).phase).toBe('PERFORM');
  });

  it('returns PERFORM for day 217', () => {
    expect(getCurrentPhaseConfig(217).phase).toBe('PERFORM');
  });

  it('returns ELITE for day 218', () => {
    expect(getCurrentPhaseConfig(218).phase).toBe('ELITE');
  });

  it('returns ELITE for day 365', () => {
    expect(getCurrentPhaseConfig(365).phase).toBe('ELITE');
  });

  it('returns ELITE for day > 365 (overflow)', () => {
    expect(getCurrentPhaseConfig(400).phase).toBe('ELITE');
  });

  it('returns a config with correct day ranges for GATE', () => {
    const config = getCurrentPhaseConfig(1);
    expect(config.days[0]).toBe(1);
    expect(config.days[1]).toBe(7);
  });
});

describe('getCurrentPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns GATE on day 1', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    expect(getCurrentPhase('2024-01-01')).toBe('GATE');
  });

  it('returns ELITE on day 218+', () => {
    vi.setSystemTime(new Date('2024-08-06')); // 218 days after 2024-01-01
    expect(getCurrentPhase('2024-01-01')).toBe('ELITE');
  });
});

describe('getCycleProgressPct', () => {
  it('returns 0 for day 0 (clamped)', () => {
    expect(getCycleProgressPct(0)).toBe(0);
  });

  it('returns ~0 for day 1', () => {
    expect(getCycleProgressPct(1)).toBe(0);
  });

  it('returns ~50 for day 183', () => {
    expect(getCycleProgressPct(183)).toBe(50);
  });

  it('returns 100 for day 365', () => {
    expect(getCycleProgressPct(365)).toBe(100);
  });

  it('caps at 100 for day > 365', () => {
    expect(getCycleProgressPct(400)).toBe(100);
  });
});

describe('getPhaseProgressPct', () => {
  it('returns ~14 on day 1 of GATE (1/7 days)', () => {
    expect(getPhaseProgressPct(1)).toBe(14);
  });

  it('returns 100 on last day of GATE (day 7)', () => {
    expect(getPhaseProgressPct(7)).toBe(100);
  });

  it('returns ~2 on first day of STABILISE (day 8)', () => {
    expect(getPhaseProgressPct(8)).toBe(2);
  });

  it('returns 100 at campaign end', () => {
    expect(getPhaseProgressPct(365)).toBe(100);
  });
});

describe('isCycleComplete', () => {
  it('returns false before day 365', () => {
    expect(isCycleComplete(364)).toBe(false);
  });

  it('returns true on day 365', () => {
    expect(isCycleComplete(365)).toBe(true);
  });

  it('returns true beyond day 365', () => {
    expect(isCycleComplete(400)).toBe(true);
  });
});

describe('KAIROS_PHASES', () => {
  it('has exactly 5 phases', () => {
    expect(KAIROS_PHASES).toHaveLength(5);
  });

  it('covers days 1 through 365 contiguously', () => {
    let expectedStart = 1;
    for (const phase of KAIROS_PHASES) {
      expect(phase.days[0]).toBe(expectedStart);
      expectedStart = phase.days[1] + 1;
    }
    expect(expectedStart - 1).toBe(365);
  });

  it('each phase has label and tagline', () => {
    for (const phase of KAIROS_PHASES) {
      expect(phase.label).toBeTruthy();
      expect(phase.tagline).toBeTruthy();
    }
  });
});
