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
    expect(source).toContain('function formatDayCount(count: number): string');
    expect(source).toContain('return `${count} ${dayUnit(count)}`;');
    expect(source).toContain('{formatDayCount(currentStreak)}');
    expect(source).toContain('Longest: {formatDayCount(longestStreak)}');
    expect(source).not.toContain(
      '<span className="text-base-subtext text-base font-normal ml-1">days</span>',
    );
    expect(source).not.toContain('{currentStreak}<span');
    expect(source).not.toContain('{dayUnit(currentStreak)}');
    expect(source).not.toContain('Longest: {streak?.longestStreak ?? 0} days');
  });

  it('uses normal-language support labels instead of framework jargon', () => {
    const source = readFileSync('src/pages/DetailScreen.tsx', 'utf8');

    expect(source).toContain('Useful ideas');
    expect(source).toContain('Get ready');
    expect(source).toContain('Keep it easy');
    expect(source).toContain('Ask yourself');
    expect(source).toContain('Good to know');
    expect(source).not.toContain('\n          Framework\n');
    expect(source).not.toContain('\n              Coach\n');
    expect(source).not.toContain('\n              Reflect\n');
    expect(source).not.toContain('\n              Feedback\n');
  });

  it('uses action language for the editable daily target', () => {
    const source = readFileSync('src/pages/DetailScreen.tsx', 'utf8');

    expect(source).toContain('Your action');
    expect(source).toContain('No action set yet.');
    expect(source).toContain('Save action');
    expect(source).not.toContain('Current focus');
    expect(source).not.toContain('No focus set yet.');
    expect(source).not.toContain('Save focus');
  });
});
