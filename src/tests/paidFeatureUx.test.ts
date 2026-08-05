import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('single app tier UX copy', () => {
  it('keeps Personal sub-routes and Squad visible in You without upgrade controls', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');
    const oldOwnerSetupTitle = ['Liam', 'Transformation'].join(' ');

    expect(source).toContain('Personal sub-routes');
    expect(source).not.toContain(oldOwnerSetupTitle);
    expect(source).not.toContain('Liam sub-routes');
    expect(source).not.toContain('high accountability prompts');
    expect(source).not.toContain('handleApplyPersonalSetup');
    expect(source).not.toContain('Journey history');
    expect(source).toContain('FEATURE_EXPLANATIONS.personalRoutes');
    expect(source).toContain('FEATURE_EXPLANATIONS.personalRoutesAction');
    expect(source).toContain('FEATURE_EXPLANATIONS.squad');
    expect(source).toContain('Find anonymous squad');
    expect(source).not.toContain('Billing portal');
    expect(source).not.toContain('Manage billing');
    expect(source).not.toContain('Upgrade');
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
