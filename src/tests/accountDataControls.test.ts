import { readFileSync } from 'node:fs';
import { PRIVACY_COPY } from '@/utils/brandCopy';
import { describe, expect, it } from 'vitest';

describe('account data controls', () => {
  it('keeps export and deletion discoverable in one separated account-data area', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(source).toContain('Account and data');
    expect(source).toContain('Download my data');
    expect(source).toContain('Delete my account');
    expect(source).toContain('border-t border-base-border');
  });

  it('requires deliberate delete confirmation and clears persisted app state', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(source).toContain('Type DELETE to confirm');
    expect(source).toContain("deletePhrase !== 'DELETE'");
    expect(source).toContain("localStorage.removeItem('12k-app-store')");
    expect(source).toContain('Delete permanently');
  });

  it('documents deletion from the You screen in privacy copy', () => {
    expect(PRIVACY_COPY.rights).toContain('export your data');
    expect(PRIVACY_COPY.rights).toContain('request account deletion from the You screen');
  });

  it('delete endpoint requires a signed-in POST before deleting auth user', () => {
    const source = readFileSync('supabase/functions/delete-account/index.ts', 'utf8');

    expect(source).toMatch(/req\.method !== ["']POST["']/);
    expect(source).toContain('Missing authorization');
    expect(source).toMatch(/supabase\.auth\.admin\.deleteUser\(\s*userId,\s*\)/);
    expect(source).toContain('profiles');
  });
});
