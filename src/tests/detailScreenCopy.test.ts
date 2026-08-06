import { readFileSync } from 'node:fs';
import { getDomainConfig } from '@/types';
import { getDailyDomainLabel } from '@/utils/v1Framework';
import { describe, expect, it } from 'vitest';

const OWNER_EMAIL = 'ldgmcdowell@gmail.com';

describe('Detail screen domain labels', () => {
  it('renders METIME detail pages as Self while keeping the internal route compatible', () => {
    const source = readFileSync('src/pages/DetailScreen.tsx', 'utf8');
    const self = getDomainConfig('METIME', OWNER_EMAIL);

    expect(self).toBeDefined();
    if (!self) throw new Error('METIME domain config missing');

    expect(self?.label).toBe('Self');
    expect(getDailyDomainLabel(self)).toBe('Self');
    expect(source).toContain('getDailyDomainLabel(domainConfig)');
  });

  it('maps stored check-in statuses to plain labels in the Today card', () => {
    const source = readFileSync('src/pages/DetailScreen.tsx', 'utf8');

    expect(source).toContain("Partial: 'Part done'");
    expect(source).toContain('const todayStatus = todayCheckIns[domainType]?.status;');
    expect(source).toContain("{todayStatus ? STATUS_LABEL[todayStatus] : 'Not checked in'}");
    expect(source).not.toContain("{todayCheckIns[domainType]?.status ?? 'Not checked in'}");
  });

  it('formats streak day counts with spacing and singular labels', () => {
    const source = readFileSync('src/pages/DetailScreen.tsx', 'utf8');

    expect(source).toContain("function dayUnit(count: number): 'day' | 'days'");
    expect(source).toContain("return count === 1 ? 'day' : 'days';");
    expect(source).toContain('{currentStreak}');
    expect(source).toContain('{dayUnit(currentStreak)}');
    expect(source).toContain('Longest: {longestStreak} {dayUnit(longestStreak)}');
    expect(source).not.toContain(
      '<span className="text-base-subtext text-base font-normal ml-1">days</span>',
    );
    expect(source).not.toContain('Longest: {streak?.longestStreak ?? 0} days');
  });
});
