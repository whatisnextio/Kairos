import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PHASES = ['KICKOFF', 'ANCHOR', 'INCREASE', 'RHYTHM', 'OWN', 'SUSTAIN'];

describe('Kairos phase database constraints', () => {
  it('repairs AI nudge and squad constraints to the current 84-day phase set', () => {
    const migration = readFileSync(
      'supabase/migrations/029_repair_kairos_phase_constraints.sql',
      'utf8',
    );

    expect(migration).toContain('ai_nudges_kairos_phase_check');
    expect(migration).toContain('squads_kairos_phase_check');

    for (const phase of PHASES) {
      expect(migration).toContain(`'${phase}'`);
    }
  });
});
