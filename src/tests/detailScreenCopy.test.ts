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
});
