import { isSquadFeatureEnabled } from '@/config/features';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('feature flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps Squad disabled unless explicitly enabled', () => {
    expect(isSquadFeatureEnabled()).toBe(false);

    vi.stubEnv('VITE_ENABLE_SQUAD', 'true');
    expect(isSquadFeatureEnabled()).toBe(true);

    vi.stubEnv('VITE_ENABLE_SQUAD', '0');
    expect(isSquadFeatureEnabled()).toBe(false);
  });
});
