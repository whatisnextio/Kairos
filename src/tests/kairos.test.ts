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

  it('returns 84 on the last day', () => {
    vi.setSystemTime(new Date('2024-03-24')); // 83 days after 2024-01-01
    expect(getDayInCycle('2024-01-01')).toBe(84);
  });

  it('never returns less than 1', () => {
    vi.setSystemTime(new Date('2023-12-31'));
    expect(getDayInCycle('2024-01-01')).toBe(1);
  });
});

describe('getCurrentPhaseConfig', () => {
  it('returns KICKOFF for day 1', () => {
    expect(getCurrentPhaseConfig(1).phase).toBe('KICKOFF');
  });

  it('returns KICKOFF for day 14', () => {
    expect(getCurrentPhaseConfig(14).phase).toBe('KICKOFF');
  });

  it('returns ANCHOR for day 15', () => {
    expect(getCurrentPhaseConfig(15).phase).toBe('ANCHOR');
  });

  it('returns ANCHOR for day 28', () => {
    expect(getCurrentPhaseConfig(28).phase).toBe('ANCHOR');
  });

  it('returns INCREASE for day 29', () => {
    expect(getCurrentPhaseConfig(29).phase).toBe('INCREASE');
  });

  it('returns RHYTHM for day 43', () => {
    expect(getCurrentPhaseConfig(43).phase).toBe('RHYTHM');
  });

  it('returns OWN for day 57', () => {
    expect(getCurrentPhaseConfig(57).phase).toBe('OWN');
  });

  it('returns SUSTAIN for day 71', () => {
    expect(getCurrentPhaseConfig(71).phase).toBe('SUSTAIN');
  });

  it('returns SUSTAIN for day 84', () => {
    expect(getCurrentPhaseConfig(84).phase).toBe('SUSTAIN');
  });

  it('returns SUSTAIN for day > 84 (overflow)', () => {
    expect(getCurrentPhaseConfig(90).phase).toBe('SUSTAIN');
  });

  it('returns a config with correct day ranges', () => {
    const config = getCurrentPhaseConfig(43);
    expect(config.days[0]).toBe(43);
    expect(config.days[1]).toBe(56);
  });
});

describe('getCurrentPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns KICKOFF on day 1', () => {
    vi.setSystemTime(new Date('2024-01-01'));
    expect(getCurrentPhase('2024-01-01')).toBe('KICKOFF');
  });

  it('returns SUSTAIN on day 84', () => {
    vi.setSystemTime(new Date('2024-03-24'));
    expect(getCurrentPhase('2024-01-01')).toBe('SUSTAIN');
  });
});

describe('getCycleProgressPct', () => {
  it('returns 0 for day 0 (clamped)', () => {
    expect(getCycleProgressPct(0)).toBe(0);
  });

  it('returns ~1 for day 1', () => {
    expect(getCycleProgressPct(1)).toBe(1);
  });

  it('returns 50 for day 42', () => {
    expect(getCycleProgressPct(42)).toBe(50);
  });

  it('returns 100 for day 84', () => {
    expect(getCycleProgressPct(84)).toBe(100);
  });

  it('caps at 100 for day > 84', () => {
    expect(getCycleProgressPct(100)).toBe(100);
  });
});

describe('getPhaseProgressPct', () => {
  it('returns ~7 on day 1 of KICKOFF (1/14 days)', () => {
    expect(getPhaseProgressPct(1)).toBe(7);
  });

  it('returns 100 on last day of KICKOFF (day 14)', () => {
    expect(getPhaseProgressPct(14)).toBe(100);
  });

  it('returns ~7 on first day of ANCHOR (day 15)', () => {
    expect(getPhaseProgressPct(15)).toBe(7);
  });

  it('returns 100 at phase end', () => {
    expect(getPhaseProgressPct(84)).toBe(100);
  });
});

describe('isCycleComplete', () => {
  it('returns false before day 84', () => {
    expect(isCycleComplete(83)).toBe(false);
  });

  it('returns true on day 84', () => {
    expect(isCycleComplete(84)).toBe(true);
  });

  it('returns true beyond day 84', () => {
    expect(isCycleComplete(90)).toBe(true);
  });
});

describe('KAIROS_PHASES', () => {
  it('has exactly 6 phases', () => {
    expect(KAIROS_PHASES).toHaveLength(6);
  });

  it('covers days 1 through 84 contiguously', () => {
    let expectedStart = 1;
    for (const phase of KAIROS_PHASES) {
      expect(phase.days[0]).toBe(expectedStart);
      expectedStart = phase.days[1] + 1;
    }
    expect(expectedStart - 1).toBe(84);
  });

  it('each phase has label and tagline', () => {
    for (const phase of KAIROS_PHASES) {
      expect(phase.label).toBeTruthy();
      expect(phase.tagline).toBeTruthy();
    }
  });
});
