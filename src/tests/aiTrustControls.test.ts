import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AI trust controls', () => {
  it('explains why Improve cards appear without opening a chatbot surface', () => {
    const source = readFileSync('src/pages/ImproveScreen.tsx', 'utf8');
    const types = readFileSync('src/types/index.ts', 'utf8');

    expect(source).toContain('Why this?');
    expect(source).toContain('buildAiWhyText');
    expect(source).toContain('Chosen from your ${phaseLabel} stage');
    expect(source).toContain('buildFrameworkWhyText');
    expect(source).toContain('AI_BOUNDARY_COPY');
    expect(source).toContain('Support only');
    expect(source).toContain('Pick one small move for today');
    expect(source).toContain('whyText: card.whyText');
    expect(types).toContain('whyText?: string');
    expect(source).not.toContain('AI acts as a Kairos accountability coach');
    expect(source).not.toContain('generated card');
    expect(source).not.toMatch(/chatbot|chat window|ask me anything/i);
  });

  it('keeps AI prompt and output inside Kairos coaching boundaries', () => {
    const source = readFileSync('supabase/functions/generate-kairos-nudge/index.ts', 'utf8');

    expect(source).toContain('Sensitive-topic boundary');
    expect(source).toContain('therapy, diagnosis, medical advice, legal advice, financial advice');
    expect(source).toContain('Age and content boundary');
    expect(source).toContain('family-safe and suitable for teens');
    expect(source).toContain('buildBoundaryNudge');
    expect(source).toContain('buildFamilySafeNudge');
    expect(source).toContain('enforceNudgeBoundaries');
    expect(source).toContain('ADVICE_BOUNDARY_PATTERN');
    expect(source).toContain('ADULT_CONTENT_PATTERN');
    expect(source).toContain('Timing rules:');
    expect(source).toContain('A Done check-in means one action was logged');
    expect(source).toContain('DAY_COMPLETION_PATTERN');
    expect(source).toContain('Do not say the day is done or complete');
    expect(source).toContain('one safe proof step');
    expect(source).toContain('qualified support where needed');
  });
});
