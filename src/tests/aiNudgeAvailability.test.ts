import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AI nudge availability', () => {
  it('lets any signed-in app user request an Improve AI card', () => {
    const hook = readFileSync('src/hooks/useNudge.ts', 'utf8');
    const improve = readFileSync('src/pages/ImproveScreen.tsx', 'utf8');

    expect(hook).toContain('const enabled = !!authUser && !!profile && !!currentCycle;');
    expect(hook).toContain("queryKey: ['nudge', profile?.id, currentCycleId, today]");
    expect(hook).toContain('body: JSON.stringify({ date: fallbackNudge.date })');
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
    expect(source).toContain('.eq("status", "active")');
    expect(source).toContain('.eq("user_id", userId)');
    expect(source).toContain('.eq("cycle_id", cycleId)');
    expect(source).toContain('onConflict: "user_id,cycle_id,date,type"');
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

  it('stores generated nudges against the active cycle', () => {
    const migration = readFileSync(
      'supabase/migrations/032_cycle_scoped_ai_nudges_and_reset_progress.sql',
      'utf8',
    );
    const source = readFileSync('supabase/functions/generate-kairos-nudge/index.ts', 'utf8');

    expect(migration).toContain('add column if not exists cycle_id uuid');
    expect(migration).toContain('ai_nudges_user_cycle_date_type_key');
    expect(migration).toContain('unique nulls not distinct (user_id, cycle_id, date, type)');
    expect(migration).toContain('foreign key (cycle_id, user_id)');
    expect(source).toContain('cycle_id: cycleId');
    expect(source).toContain('.eq("cycle_id", cycleId)');
  });

  it('keeps cycle reflections and daily push delivery scoped to active cycles', () => {
    const reflection = readFileSync(
      'supabase/functions/generate-cycle-reflection/index.ts',
      'utf8',
    );
    const push = readFileSync('supabase/functions/send-daily-push/index.ts', 'utf8');

    expect(reflection).toContain('.eq("cycle_id", cycle.id)');
    expect(reflection).toContain('cycle_id: cycle.id');
    expect(reflection).toContain('onConflict: "user_id,cycle_id,date,type"');
    expect(push).toContain('current_kairos_cycle_id');
    expect(push).toContain('activeCycleByUser');
    expect(push).toContain('nudge.cycle_id === activeCycleByUser.get(nudge.user_id)');
    expect(push).toContain('getLondonIsoDate');
  });
});
