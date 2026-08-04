import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Home journey language', () => {
  it('shows the saved profile image and 12-week journey context on Home', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

    expect(home).toContain('profileImageDataUrl');
    expect(home).toContain('alt={`${profile.displayName} profile`}');
    expect(home).toContain('12-week reset for {firstName}');
    expect(home).toContain('Day {displayDay} of {KAIROS_CYCLE_LENGTH_DAYS}');
    expect(home).toContain('{phaseConfig.label} phase');
    expect(home).toContain("Today's Kairos proof");
    expect(home).toContain('Day {phaseDay} of {phaseLength}');
  });

  it('explains Partial and opens the weekly check-in with explicit copy', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const you = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(home).toContain('Mark Partial');
    expect(home).toContain('Partial means the smallest useful version was completed.');
    expect(you).toContain('Open weekly check-in');
    expect(you).not.toContain('>Open check-in<');
  });
});
