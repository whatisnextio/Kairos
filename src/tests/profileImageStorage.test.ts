import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('profile image account storage guardrails', () => {
  it('explains account photo storage and caps resized images before saving', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');
    const migration = readFileSync('supabase/migrations/028_user_settings.sql', 'utf8');

    expect(source).toContain('PROFILE_IMAGE_MAX_BYTES = 300_000');
    expect(source).toContain('function estimateDataUrlBytes');
    expect(source).toContain('estimateDataUrlBytes(output) > PROFILE_IMAGE_MAX_BYTES');
    expect(source).toContain("canvas.toDataURL('image/jpeg', quality)");
    expect(source).toContain('setProfileImageDataUrl(resized)');
    expect(source).toContain('Press Save settings to sync this photo to your account.');
    expect(migration).toContain('profile_image_data_url text');
    expect(migration).toContain('octet_length(profile_image_data_url) <= 450000');
  });
});
