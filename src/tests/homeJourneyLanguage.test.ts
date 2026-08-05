import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Home journey language', () => {
  it('shows the saved profile image and 12-week journey context on Home', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

    expect(home).toContain('profileImageDataUrl');
    expect(home).toContain('alt={`${profile.displayName} profile`}');
    expect(home).toContain('12-week reset for {firstName}');
    expect(home).toContain('Day {displayDay} of {KAIROS_CYCLE_LENGTH_DAYS}');
    expect(home).toContain('{phaseConfig.label}');
    expect(home).toContain("Today's plan");
    expect(home).toContain('Day {phaseDay} of {phaseLength}');
  });

  it('explains Partial and opens the weekly check-in with explicit copy', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const framework = readFileSync('src/utils/v1Framework.ts', 'utf8');
    const you = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(home).toContain('data-testid="day-state-protocol"');
    expect(framework).toContain('Mark Partial');
    expect(home + framework).toContain('Partial means the smallest useful version was completed.');
    expect(framework).toContain('Record what happened');
    expect(home).not.toContain('honest status');
    expect(home).not.toContain('stop the drift');
    expect(you).toContain('Open weekly check-in');
    expect(you).not.toContain('>Open check-in<');
  });
});
