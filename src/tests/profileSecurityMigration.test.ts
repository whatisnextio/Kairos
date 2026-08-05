import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/027_single_app_access.sql'),
  'utf8',
);

describe('profile security migration', () => {
  it('blocks direct app access, billing, XP, and squad field changes', () => {
    for (const column of [
      'tier',
      'xp',
      'squad_id',
      'stripe_customer_id',
      'stripe_subscription_id',
      'subscription_status',
      'cancel_at_period_end',
      'current_period_end',
    ]) {
      expect(migration).toContain(`new.${column} is distinct from old.${column}`);
    }
  });

  it('defaults profiles to app access while keeping trusted update protection', () => {
    expect(migration).toContain("alter column tier set default 'brotherhood'");
    expect(migration).toContain("alter column subscription_status set default 'active'");
    expect(migration).toContain("new.tier <> 'brotherhood'");
    expect(migration).toContain('Profile app access fields cannot be set directly');
  });
});
