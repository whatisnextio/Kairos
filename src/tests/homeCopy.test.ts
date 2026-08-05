import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Home copy contract', () => {
  it('uses natural accountability prompt language for open domains', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const framework = readFileSync('src/utils/v1Framework.ts', 'utf8');
    const source = `${home}\n${framework}`;

    expect(home).toContain('selectDayStateProtocol');
    expect(source).toContain('still needs a check-in');
    expect(source).toContain('Record what happened');
    expect(source).toContain('Use "Part done" when you did a smaller version');
    expect(source).not.toContain('Choose the honest status');
    expect(source).not.toContain('Partial is fine for a smaller version');
  });
});
