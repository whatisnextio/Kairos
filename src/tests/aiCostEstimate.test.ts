import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AI provider cost estimates', () => {
  it('uses current Anthropic model pricing without double-multiplying currency units', () => {
    const helper = readFileSync('supabase/functions/_shared/anthropicCost.ts', 'utf8');
    const nudgeFunction = readFileSync('supabase/functions/generate-kairos-nudge/index.ts', 'utf8');
    const reflectionFunction = readFileSync(
      'supabase/functions/generate-cycle-reflection/index.ts',
      'utf8',
    );

    expect(helper).toContain('"claude-haiku-4-5-20251001"');
    expect(helper).toContain('inputUsdPerMillion: 1');
    expect(helper).toContain('outputUsdPerMillion: 5');
    expect(helper).toContain('"claude-sonnet-4-6"');
    expect(helper).toContain('inputUsdPerMillion: 3');
    expect(helper).toContain('outputUsdPerMillion: 15');
    expect(helper).toContain('USD_TO_GBP_PENCE');
    expect(helper).not.toContain('* 100 * 100');
    expect(nudgeFunction).toContain('estimateAnthropicCostPence');
    expect(reflectionFunction).toContain('estimateAnthropicCostPence');
  });

  it('stores cost_pence as fractional pence', () => {
    const migration = readFileSync(
      'supabase/migrations/030_fix_ai_cost_pence_precision.sql',
      'utf8',
    );

    expect(migration).toContain('numeric(12,4)');
    expect(migration).toContain('Fractional values are expected');
    expect(migration).toContain("when type = 'cycle_reflection' then 125");
  });
});
