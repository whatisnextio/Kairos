import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync('src/components/modals/ProgressiveDomainSetupModal.tsx', 'utf8');

describe('ProgressiveDomainSetupModal contract', () => {
  it('keeps a skip path and an explicit retry path visible after save errors', () => {
    const modal = source();

    expect(modal).toContain('Skip for now');
    expect(modal).toContain('Retry save');
    expect(modal).toContain('Try again or skip for now.');
    expect(modal).toContain('role="alert"');
  });

  it('stores basic-tier domain setup locally before any Supabase write is attempted', () => {
    const modal = source();
    const guardIndex = modal.indexOf('if (!hasBrotherhoodAccess(profile.tier))');
    const supabaseWriteIndex = modal.indexOf('await supabase');

    expect(modal).toContain("import { hasBrotherhoodAccess } from '@/utils/entitlements';");
    expect(modal).toContain('addLocalFocus(crypto.randomUUID(), new Date().toISOString());');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(supabaseWriteIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(supabaseWriteIndex);
  });
});
