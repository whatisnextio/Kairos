import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('single app tier UX copy', () => {
  it('keeps extra actions visible without upgrade controls', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');
    const oldOwnerSetupTitle = ['Liam', 'Transformation'].join(' ');

    expect(source).toContain('Extra actions');
    expect(source).not.toContain(oldOwnerSetupTitle);
    expect(source).not.toContain('Liam sub-routes');
    expect(source).not.toContain('high accountability prompts');
    expect(source).not.toContain('handleApplyPersonalSetup');
    expect(source).not.toContain('Journey history');
    expect(source).toContain('FEATURE_EXPLANATIONS.personalRoutes');
    expect(source).toContain('FEATURE_EXPLANATIONS.personalRoutesAction');
    expect(source).toContain('tipId="settings-sub-focus"');
    expect(source).toContain('Create your own extra actions');
    expect(source).toContain('Body, Fuel, Self, and Connection never change');
    expect(source).not.toContain('Billing portal');
    expect(source).not.toContain('Manage billing');
    expect(source).not.toContain('Upgrade');
  });

  it('hides Squad behind an explicit readiness flag', () => {
    const youScreen = readFileSync('src/pages/YouScreen.tsx', 'utf8');
    const homeScreen = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const squadHook = readFileSync('src/hooks/useSquad.ts', 'utf8');

    expect(youScreen).toContain('squadFeatureEnabled &&');
    expect(homeScreen).toContain('squadFeatureEnabled && hasBrotherhoodAccess');
    expect(squadHook).toContain('isSquadFeatureEnabled() &&');
    expect(squadHook).toContain("throw new Error('Squad is not enabled')");
    expect(youScreen).toContain('Find anonymous squad');
  });

  it('redirects the obsolete subscription route back to You', () => {
    const source = readFileSync('src/App.tsx', 'utf8');

    expect(source).toContain(
      '<Route path="/subscription" element={<Navigate to="/you" replace />} />',
    );
    expect(source).not.toContain('SubscriptionScreen');
    expect(source).not.toContain('useSubscriptionVerification');
  });
});
