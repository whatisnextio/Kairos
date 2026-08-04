import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/024_harden_profile_sensitive_updates.sql'),
  'utf8',
);

describe('profile security migration', () => {
  it('blocks direct entitlement, billing, XP, and squad field changes', () => {
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

  it('keeps trusted RPC paths for XP and complimentary Lifechanger access', () => {
    expect(migration).toContain("set_config('app.profile_trusted_update', 'true', true)");
    expect(migration).toContain('claim_complimentary_lifechanger');
    expect(migration).toContain("user_email <> 'ldgmcdowell@gmail.com'");
  });
});
