import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Home copy contract', () => {
  it('uses natural accountability prompt language for open domains', () => {
    const source = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

    expect(source).toContain('still needs a check-in');
    expect(source).toContain('Mark what actually happened');
    expect(source).toContain('A smaller version still counts');
    expect(source).not.toContain('Choose the honest status');
    expect(source).not.toContain('Partial is fine for a smaller version');
  });
});
