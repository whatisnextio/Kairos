import { readFileSync } from 'node:fs';
import { DOMAINS, getAvailableDomains, getDomainConfig } from '@/types';
import { buildDomainSetupOptionModel, getConnectionContextOptions } from '@/utils/v1Framework';
import { describe, expect, it } from 'vitest';

const setupSources = () =>
  [
    readFileSync('src/pages/onboarding/OnboardingFlow.tsx', 'utf8'),
    readFileSync('src/pages/DetailScreen.tsx', 'utf8'),
    readFileSync('src/components/modals/ProgressiveDomainSetupModal.tsx', 'utf8'),
    readFileSync('src/pages/YouScreen.tsx', 'utf8'),
    readFileSync('src/components/common/SetupOptionSections.tsx', 'utf8'),
  ].join('\n');

describe('guided domain setup model', () => {
  it('gives every core category enough action, prep, and recovery options', () => {
    const coreDomains = DOMAINS.filter((domain) =>
      ['BODY', 'FUEL', 'METIME', 'USTIME'].includes(domain.type),
    );

    expect(coreDomains.map((domain) => domain.label)).toEqual([
      'Body',
      'Fuel',
      'Self',
      'Connection',
    ]);
    for (const domain of coreDomains) {
      const model = buildDomainSetupOptionModel(domain);

      expect(model.focusOptions.length).toBeGreaterThanOrEqual(6);
      expect(model.prepOptions.length).toBeGreaterThanOrEqual(3);
      expect(model.recoveryOptions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps onboarding, Detail, progressive setup, and sub-routes on the same option model', () => {
    const source = setupSources();

    expect(source.match(/buildDomainSetupOptionModel/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source.match(/SetupOptionSections/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('Action options');
    expect(source).toContain('Prep options');
    expect(source).toContain('Recovery options');
  });

  it('keeps custom input available but secondary in setup paths', () => {
    const source = setupSources();
    const firstGuidedIndex = source.indexOf('SetupOptionSections');
    const firstCustomIndex = source.indexOf('Custom.');

    expect(firstGuidedIndex).toBeGreaterThan(-1);
    expect(firstCustomIndex).toBeGreaterThan(-1);
    expect(firstGuidedIndex).toBeLessThan(firstCustomIndex);
    expect(source).not.toMatch(/freeform-only|freeform first/i);
  });

  it('lets personal sub-routes inherit parent options and add route-specific choices', () => {
    const parent = getDomainConfig('METIME');
    expect(parent).toBeDefined();
    if (!parent) throw new Error('Self domain missing');
    const model = buildDomainSetupOptionModel(parent, {
      label: 'Lens',
      focusDescription: 'Edit one keeper',
    });

    expect(model.focusOptions[0]).toBe('Edit one keeper');
    expect(model.focusOptions).toContain('Take a 10-minute reset');
    expect(model.prepOptions).toContain('Choose the place');
    expect(model.recoveryOptions).toContain('Write one honest line and stop');
    expect(getAvailableDomains('user@example.com').map((domain) => domain.label)).toEqual([
      'Body',
      'Fuel',
      'Self',
      'Connection',
    ]);
  });

  it('keeps Connection recipient and context options guided but discreet', () => {
    const connection = getDomainConfig('USTIME');
    expect(connection).toBeDefined();
    if (!connection) throw new Error('Connection domain missing');
    const model = buildDomainSetupOptionModel(connection);
    const partnerContextIds = getConnectionContextOptions('partner').map((option) => option.id);
    const familyContextIds = getConnectionContextOptions('family').map((option) => option.id);

    expect(model.focusOptions).toContain('Offer affection with no agenda');
    expect(partnerContextIds).toContain('consent_led_closeness');
    expect(familyContextIds).not.toContain('consent_led_closeness');
    expect(model.focusOptions.join(' ')).not.toMatch(/sex|wife|husband|intimacy/i);
  });

  it('keeps option chips usable at narrow mobile widths', () => {
    const component = readFileSync('src/components/common/SetupOptionSections.tsx', 'utf8');

    expect(component).toContain('min-h-11');
    expect(component).toContain('grid-cols-1');
    expect(component).toContain('aria-pressed');
  });
});
