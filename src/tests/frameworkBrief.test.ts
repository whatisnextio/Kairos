import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('canonical Kairos framework brief', () => {
  const brief = readFileSync('docs/FRAMEWORK.md', 'utf8');

  it('defines the framework in the same terms used by the app', () => {
    expect(brief).toContain('12K is a guided 12-week reset powered by Kairos');
    expect(brief).toContain('not a 12-step programme');
    expect(brief).toContain('Kairos means the right moment');
    expect(brief).toContain('Start with one small action.');
    expect(brief).toContain('Body');
    expect(brief).toContain('Fuel');
    expect(brief).toContain('Self');
    expect(brief).toContain('Connection');
  });

  it('documents the stage arc, behaviour model, AI role, and privacy rules', () => {
    expect(brief).toContain('six simple two-week stages');
    expect(brief).toContain('Kickoff');
    expect(brief).toContain('Sustain');
    expect(brief).toContain('clear goals and planning');
    expect(brief).toContain('simple reminders');
    expect(brief).toContain('daily check-ins');
    expect(brief).not.toMatch(/self-monitoring|lapses|14-day phases|opportune moment/i);
    expect(brief).toContain('AI should act as the framework voice');
    expect(brief).toContain('Labels must be discreet');
  });

  it('keeps IP and research claims within safe boundaries', () => {
    expect(brief).toContain('not legal advice');
    expect(brief).toContain('Do not claim ownership of the ancient Greek word "Kairos" itself');
    expect(brief).toContain('Do not say Kairos is Latin or that it means "implement"');
    expect(brief).toContain('Do not imply copyright protects the underlying idea');
    expect(brief).toContain('Formal review should include UK, US, EU, WIPO Global Brand Database');
    expect(brief).toContain('12 weeks should be positioned as a useful reset arc');
    expect(brief).not.toMatch(/guaranteed transformation|guarantee a transformation/i);
  });
});
