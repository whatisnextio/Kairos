import { readFileSync } from 'node:fs';
import { DOMAINS, PUBLIC_DOMAIN_TYPES, getAvailableDomains } from '@/types';
import { getDailyDomainLabel } from '@/utils/v1Framework';
import { describe, expect, it } from 'vitest';

const OWNER_EMAIL = 'ldgmcdowell@gmail.com';

describe('core platform labels', () => {
  it('shows Liam the same four public labels as every other user', () => {
    const liamLabels = getAvailableDomains(OWNER_EMAIL).map(getDailyDomainLabel);
    const publicLabels = getAvailableDomains('user@example.com').map(getDailyDomainLabel);

    expect(liamLabels).toEqual(['Body', 'Fuel', 'Self', 'Connection']);
    expect(publicLabels).toEqual(liamLabels);
    const publicConfiguredLabels = DOMAINS.filter((domain) =>
      PUBLIC_DOMAIN_TYPES.includes(domain.type),
    ).map((domain) => domain.label);

    expect(publicConfiguredLabels).toEqual(liamLabels);
  });

  it('does not keep owner-only coded labels in source copy', () => {
    const visibleSources = [
      readFileSync('src/types/index.ts', 'utf8'),
      readFileSync('src/utils/v1Framework.ts', 'utf8'),
      readFileSync('src/pages/HomeScreen.tsx', 'utf8'),
      readFileSync('src/pages/ProgressScreen.tsx', 'utf8'),
      readFileSync('src/pages/DetailScreen.tsx', 'utf8'),
    ].join('\n');
    const oldSelfRouteName = ['Me', 'Time'].join(' ');
    const oldConnectionRouteName = ['Us', 'Time'].join(' ');
    const oldSelfCode = String.fromCharCode(77, 84);
    const oldConnectionCode = String.fromCharCode(85, 84);
    const oldFieldName = ['owner', 'Label'].join('');
    const oldMapName = ['OWNER', 'DISCREET', 'LABELS'].join('_');

    expect(visibleSources).not.toContain(oldSelfRouteName);
    expect(visibleSources).not.toContain(oldConnectionRouteName);
    expect(visibleSources).not.toContain(`'${oldSelfCode}'`);
    expect(visibleSources).not.toContain(`'${oldConnectionCode}'`);
    expect(visibleSources).not.toContain(oldFieldName);
    expect(visibleSources).not.toContain(oldMapName);
  });
});
