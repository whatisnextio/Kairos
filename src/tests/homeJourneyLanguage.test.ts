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

  it('shows a dismissible Kairos explainer after first sign-in', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

    expect(home).toContain('KAIROS_EXPLAINER_DISMISSED_KEY_PREFIX');
    expect(home).toContain('readKairosExplainerDismissed(profile.id)');
    expect(home).toContain('writeKairosExplainerDismissed(profile.id)');
    expect(home).toContain('Why Kairos works');
    expect(home).toContain('KAIROS in 12K');
    expect(home).toContain('{phase.label.charAt(0)} - {phase.label}');
    expect(home).toContain('PRODUCT_POSITIONING.kairosMeaning');
    expect(home).toContain('PRODUCT_POSITIONING.proofLoop');
    expect(home).toContain('clear goals, prompts');
    expect(home).toContain('aria-label="Dismiss Kairos explainer"');
  });

  it('shows a permanently dismissible category tooltip on Home', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const tip = readFileSync('src/components/common/DismissibleTip.tsx', 'utf8');
    const tipStorage = readFileSync('src/utils/dismissibleTips.ts', 'utf8');

    expect(tipStorage).toContain('kairos_dismissible_tip_v1');
    expect(tipStorage).toContain("'home-framework-categories'");
    expect(tip).toContain('writeDismissibleTip(profileId, tipId)');
    expect(tip).toContain('aria-label={`Dismiss ${title} tip`}');
    expect(home).toContain('CORE_CATEGORY_LABELS');
    expect(home).toContain("['Body', 'Fuel', 'Self', 'Connection']");
    expect(home).toContain('The four categories stay fixed');
    expect(home).toMatch(/Extra actions sit\s+underneath/);
  });

  it('explains Part done and opens the weekly check-in with explicit copy', () => {
    const home = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
    const framework = readFileSync('src/utils/v1Framework.ts', 'utf8');
    const you = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(home).toContain('data-testid="day-state-protocol"');
    expect(framework).toContain('Mark Part done');
    expect(home + framework).toContain('one small useful action can be Part done');
    expect(framework).toContain('Record what happened');
    expect(home).not.toContain('honest status');
    expect(home).not.toContain('stop the drift');
    expect(you).toContain('Open weekly check-in');
    expect(you).not.toContain('>Open check-in<');
  });
});
