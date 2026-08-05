import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AI nudge availability', () => {
  it('lets any signed-in app user request an Improve AI card', () => {
    const hook = readFileSync('src/hooks/useNudge.ts', 'utf8');
    const improve = readFileSync('src/pages/ImproveScreen.tsx', 'utf8');

    expect(hook).toContain('const enabled = !!authUser && !!profile;');
    expect(hook).not.toContain('hasBrotherhoodAccess(profile.tier) || isSunday');
    expect(improve).not.toContain('Unlock Kairos Plus');
    expect(improve).not.toContain('Free tier gets one nudge on Sundays');
    expect(improve).toContain('Generate coach card');
  });

  it('keeps the Edge Function from failing when the AI provider is unavailable', () => {
    const source = readFileSync('supabase/functions/generate-kairos-nudge/index.ts', 'utf8');

    expect(source).not.toContain('tier_gate');
    expect(source).not.toContain('Free tier gets nudges on Sundays only');
    expect(source).not.toContain('Kairos Plus standard support');
    expect(source).toContain('function buildFallbackNudge');
    expect(source).toContain('AI provider unavailable, using fallback nudge');
    expect(source).toContain('result = buildFallbackNudge(state);');
    expect(source).toContain(".eq('status', 'active')");
    expect(source).toContain('local-fallback-nudge:');
    expect(source).toContain('stored: false');
  });

  it('uses a local Improve card when the Edge Function is unavailable', () => {
    const hook = readFileSync('src/hooks/useNudge.ts', 'utf8');
    const improve = readFileSync('src/pages/ImproveScreen.tsx', 'utf8');

    expect(hook).toContain('buildLocalFallbackNudge');
    expect(hook).toContain('return fallbackNudge');
    expect(hook).toContain('LOCAL_FALLBACK_NUDGE_ID_PREFIX');
    expect(improve).toContain('LOCAL_FALLBACK_NUDGE_ID_PREFIX');
    expect(improve).toContain('isFallbackNudge');
    expect(improve).toContain('Kairos fallback');
    expect(improve).toContain('The card below is a Kairos fallback from your setup');
    expect(improve).toContain('Retry coach card');
  });
});
