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
  it('keeps every core category focused to a small starter choice set', () => {
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

      expect(model.focusOptions.length).toBeGreaterThanOrEqual(2);
      expect(model.focusOptions.length).toBeLessThanOrEqual(3);
      expect(model.prepOptions.length).toBeGreaterThanOrEqual(3);
      expect(model.recoveryOptions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps onboarding simple while detailed setup paths reuse the option model', () => {
    const source = setupSources();

    expect(source).toContain('Choose your four actions.');
    expect(source).toContain('Pick one simple starter action in each area.');
    expect(source.match(/buildDomainSetupOptionModel/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source.match(/SetupOptionSections/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('Action options');
    expect(source).toContain('Prep options');
    expect(source).toContain('Recovery options');
  });

  it('keeps custom input available in setup paths', () => {
    const source = setupSources();

    expect(source).toContain('Or write your own action');
    expect(source).toContain('Or write your own');
    expect(source).toContain('Custom.');
    expect(source).not.toMatch(/freeform-only|freeform first/i);
  });

  it('lets extra actions inherit parent options and add route-specific choices', () => {
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

  it('keeps Connection options guided but discreet', () => {
    const connection = getDomainConfig('USTIME');
    expect(connection).toBeDefined();
    if (!connection) throw new Error('Connection domain missing');
    const model = buildDomainSetupOptionModel(connection);
    const partnerContextIds = getConnectionContextOptions('partner').map((option) => option.id);
    const familyContextIds = getConnectionContextOptions('family').map((option) => option.id);

    expect(model.focusOptions).toContain('Have a no-phone conversation');
    expect(partnerContextIds).toContain('warmth');
    expect(partnerContextIds).not.toContain('consent_led_closeness');
    expect(familyContextIds).not.toContain('comfort_first');
    expect(model.focusOptions.join(' ')).not.toMatch(/sex|sexual|wife|husband|intimacy|intimate/i);
  });

  it('keeps option chips usable at narrow mobile widths', () => {
    const component = readFileSync('src/components/common/SetupOptionSections.tsx', 'utf8');

    expect(component).toContain('min-h-11');
    expect(component).toContain('grid-cols-1');
    expect(component).toContain('aria-pressed');
  });
});
