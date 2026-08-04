import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('paid feature UX copy', () => {
  it('uses clear Personal routes and Squad explanations in You', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(source).toContain('Personal routes');
    expect(source).toContain('FEATURE_EXPLANATIONS.personalRoutes');
    expect(source).toContain('FEATURE_EXPLANATIONS.personalRoutesAction');
    expect(source).toContain('FEATURE_EXPLANATIONS.squad');
    expect(source).toContain('Find anonymous squad');
    expect(source).not.toContain('Find my squad');
    expect(source).not.toContain('Squad pulse drops on Sundays');
  });

  it('uses the same feature definitions in Subscription', () => {
    const source = readFileSync('src/pages/SubscriptionScreen.tsx', 'utf8');

    expect(source).toContain('FEATURE_EXPLANATIONS.personalRoutes');
    expect(source).toContain('FEATURE_EXPLANATIONS.squad');
    expect(source).toContain('FEATURE_EXPLANATIONS.lifechanger');
    expect(source).not.toMatch(/coming soon/i);
  });
});
