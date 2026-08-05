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

  it('keeps Home focused on action rather than an explainer before check-in', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

    expect(home).not.toContain('KAIROS_EXPLAINER_DISMISSED_KEY_PREFIX');
    expect(home).not.toContain('Why Kairos works');
    expect(home).not.toContain('KAIROS in 12K');
    expect(home).not.toContain('Framework tip');
  });

  it('keeps reusable tips simple away from the Home first screen', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const tip = readFileSync('src/components/common/DismissibleTip.tsx', 'utf8');
    const tipStorage = readFileSync('src/utils/dismissibleTips.ts', 'utf8');

    expect(tipStorage).toContain('kairos_dismissible_tip_v1');
    expect(tip).toContain('writeDismissibleTip(profileId, tipId)');
    expect(tip).toContain('aria-label={`Hide ${title} tip`}');
    expect(home).not.toContain('CORE_CATEGORY_LABELS');
    expect(home).not.toContain('The four categories stay fixed');
  });

  it('explains Part done and opens the weekly check-in with explicit copy', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const framework = readFileSync('src/utils/v1Framework.ts', 'utf8');
    const you = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(home).toContain('data-testid="day-state-protocol"');
    expect(framework).toContain("label: 'Part done'");
    expect(home + framework).toContain('a smaller useful action still counts');
    expect(framework).toContain('Record what happened');
    expect(home).not.toContain('honest status');
    expect(home).not.toContain('stop the drift');
    expect(you).toContain('Open weekly check-in');
    expect(you).not.toContain('>Open check-in<');
  });
});
