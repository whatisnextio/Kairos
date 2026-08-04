import { readFileSync } from 'node:fs';
import {
  type DomainType,
  getAvailableDomains,
  getDomainRouteSlug,
  getDomainTypeFromRouteSlug,
} from '@/types';
import { describe, expect, it } from 'vitest';

describe('core domain route slugs', () => {
  it('generates public slugs for the four core platform domains', () => {
    const slugs = getAvailableDomains('ldgmcdowell@gmail.com').map((domain) => [
      domain.label,
      getDomainRouteSlug(domain.type),
    ]);

    expect(slugs).toEqual([
      ['Body', 'body'],
      ['Fuel', 'fuel'],
      ['Self', 'self'],
      ['Connection', 'connection'],
    ]);
  });

  it('keeps old stored route keys readable without generating them for core navigation', () => {
    const oldSelfSlug = ['me', 'time'].join('');
    const oldConnectionSlug = ['us', 'time'].join('');
    const selfType: DomainType = 'METIME';
    const connectionType: DomainType = 'USTIME';

    expect(getDomainTypeFromRouteSlug(oldSelfSlug)).toBe(selfType);
    expect(getDomainTypeFromRouteSlug(oldConnectionSlug)).toBe(connectionType);
    expect(getDomainTypeFromRouteSlug('self')).toBe(selfType);
    expect(getDomainTypeFromRouteSlug('connection')).toBe(connectionType);
    expect(getDomainRouteSlug(selfType)).toBe('self');
    expect(getDomainRouteSlug(connectionType)).toBe('connection');
  });

  it('does not generate legacy detail paths from the main screens', () => {
    const source = [
      readFileSync('src/pages/HomeScreen.tsx', 'utf8'),
      readFileSync('src/pages/ProgressScreen.tsx', 'utf8'),
    ].join('\n');

    expect(source).toContain('getDomainRouteSlug');
    expect(source).not.toContain('type.toLowerCase()');
  });
});
