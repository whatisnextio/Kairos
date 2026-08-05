import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('profile image local storage guardrails', () => {
  it('explains device-local photo storage and caps resized images before persisting', () => {
    const source = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(source).toContain('PROFILE_IMAGE_MAX_BYTES = 300_000');
    expect(source).toContain('function estimateDataUrlBytes');
    expect(source).toContain('estimateDataUrlBytes(output) > PROFILE_IMAGE_MAX_BYTES');
    expect(source).toContain("canvas.toDataURL('image/jpeg', quality)");
    expect(source).toContain('setProfileImageDataUrl(resized)');
    expect(source).toContain('Photo saved on this browser. Upload again on other devices.');
  });
});
