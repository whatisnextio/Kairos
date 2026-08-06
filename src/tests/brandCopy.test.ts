import { FEATURE_EXPLANATIONS, HELP_FAQS, TERMS_COPY } from '@/utils/brandCopy';
import { describe, expect, it } from 'vitest';

describe('brand and help copy contract', () => {
  it('covers the expected product-support topics in Help and FAQ', () => {
    const questions = HELP_FAQS.map((item) => item.q);
    const kairosAnswer = HELP_FAQS.find((item) => item.q === 'What is the Kairos system?')?.a;

    expect(questions).toEqual(
      expect.arrayContaining([
        'What is 12K?',
        'What does 12K stand for?',
        'What is the Kairos system?',
        'What research is it based on?',
        'Why Self, not Mind?',
        'What does Connection include?',
        'Can I add extra actions?',
        'What does reset do?',
        'How do notifications work?',
        'How does the extra idea work?',
      ]),
    );
    expect(kairosAnswer).toContain('Greek');
    expect(kairosAnswer).toContain('Kickoff, Anchor, Increase, Rhythm, Own, and Sustain');
    expect(kairosAnswer).toContain('choose one useful action');
    expect(kairosAnswer).toContain('six simple two-week stages');
    expect(kairosAnswer).not.toMatch(/latin|implement/i);
    expect(kairosAnswer).not.toMatch(/opportune|14-day phases/i);
  });

  it('explains 12K without implying a 12-step programme or guaranteed outcome', () => {
    const standForAnswer = HELP_FAQS.find((item) => item.q === 'What does 12K stand for?')?.a;
    const researchAnswer = HELP_FAQS.find((item) => item.q === 'What research is it based on?')?.a;

    expect(standForAnswer).toContain('12 weeks powered by Kairos');
    expect(standForAnswer).toContain('not 12 steps');
    expect(standForAnswer).toContain('84 days');
    expect(researchAnswer).toContain('clear goals');
    expect(researchAnswer).toContain('daily check-ins');
    expect(researchAnswer).toContain('missed days');
    expect(researchAnswer).toContain('not medical advice');
    expect(`${standForAnswer} ${researchAnswer}`).not.toMatch(
      /guarantee|cure|diagnos|self-monitoring|lapses|behaviour-change ingredients/i,
    );
  });

  it('keeps public copy aligned to a single app tier', () => {
    const publicCopy = [
      ...HELP_FAQS.flatMap((item) => [item.q, item.a]),
      ...Object.values(FEATURE_EXPLANATIONS),
      ...Object.values(TERMS_COPY),
    ].join(' ');

    expect(publicCopy).toContain('work, money, photography');
    expect(publicCopy).toContain('suggests short actions');
    expect(publicCopy).toContain('not a chat app or professional advice');
    expect(publicCopy).not.toContain('AI acts as a Kairos accountability coach');
    expect(publicCopy).not.toMatch(/\bAI nudges\b|Today's nudge/i);
    expect(publicCopy).not.toMatch(/\bprompt\b|\bprompts\b/i);
    expect(publicCopy).not.toMatch(/Kairos Plus|Lifechanger|checkout|billing portal|paid tier/i);
    expect(publicCopy).not.toContain('Brotherhood');
    expect(publicCopy).not.toMatch(/\bmen\b|\bman\b|male/i);
    expect(publicCopy).not.toMatch(/\b[Mm]ark (Done|what happened)/);
    expect(publicCopy).not.toMatch(
      /self-monitoring|lapses|opportune moment|14-day phases|behaviour-change ingredients|anonymous accountability/i,
    );
  });

  it('explains app features without vague coming-soon language', () => {
    const featureCopy = Object.values(FEATURE_EXPLANATIONS).join(' ');

    expect(FEATURE_EXPLANATIONS.personalRoutes).toContain('extra action under one core area');
    expect(FEATURE_EXPLANATIONS.personalRoutesAction).toContain('Home, Progress, and Improve');
    expect(FEATURE_EXPLANATIONS.squad).toContain('private weekly check-in');
    expect(FEATURE_EXPLANATIONS.squad).toContain('similar point in 12K');
    expect(FEATURE_EXPLANATIONS.squad).not.toMatch(/Kairos phase/i);
    expect(FEATURE_EXPLANATIONS.notifications).toContain('opt-in device reminders');
    expect(featureCopy).not.toMatch(/coming soon/i);
  });
});
