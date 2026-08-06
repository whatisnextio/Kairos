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
    expect(source).toContain('a smaller useful action still counts');
    expect(source).toContain('Check in now or set up tomorrow');
    expect(source).toContain('Check in ${target.label}');
    expect(home).toContain('Helpful idea');
    expect(home).toContain('Not now hides this reminder on this device');
    expect(home).not.toContain('If the same item stays open');
    expect(home).not.toContain('Helpful prompt');
    expect(home).not.toContain('Not now hides this prompt on this device');
    expect(source).not.toContain('Choose what happened, then plan tomorrow');
    expect(source).not.toContain('Choose the honest status');
    expect(source).not.toContain('Partial is fine for a smaller version');
  });
});
