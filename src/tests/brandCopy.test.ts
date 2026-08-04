import { FEATURE_EXPLANATIONS, HELP_FAQS, SUBSCRIPTION_COPY, TERMS_COPY } from '@/utils/brandCopy';
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
        'What does reset do?',
        'How do notifications work?',
        'How does the AI nudge work?',
        'What is Kairos Plus?',
        'What is Lifechanger?',
        'Why can I not open checkout?',
      ]),
    );
    expect(kairosAnswer).toContain('Greek');
    expect(kairosAnswer).toContain('Kickoff, Anchor, Increase, Rhythm, Own, and Sustain');
    expect(kairosAnswer).toContain('Choose one useful move');
    expect(kairosAnswer).not.toMatch(/latin|implement/i);
  });

  it('explains 12K without implying a 12-step programme or guaranteed outcome', () => {
    const standForAnswer = HELP_FAQS.find((item) => item.q === 'What does 12K stand for?')?.a;
    const researchAnswer = HELP_FAQS.find((item) => item.q === 'What research is it based on?')?.a;

    expect(standForAnswer).toContain('12 weeks powered by Kairos');
    expect(standForAnswer).toContain('not 12 steps');
    expect(standForAnswer).toContain('six-phase, 84-day reset');
    expect(researchAnswer).toContain('clear goals');
    expect(researchAnswer).toContain('prompts and cues');
    expect(researchAnswer).toContain('self-monitoring');
    expect(researchAnswer).toContain('not medical advice');
    expect(`${standForAnswer} ${researchAnswer}`).not.toMatch(/guarantee|cure|diagnos/i);
  });

  it('keeps subscription copy aligned with current V1 capability', () => {
    const publicCopy = [
      SUBSCRIPTION_COPY.title,
      SUBSCRIPTION_COPY.intro,
      SUBSCRIPTION_COPY.lifechanger,
      ...SUBSCRIPTION_COPY.paidFeatures,
      ...SUBSCRIPTION_COPY.lifechangerFeatures,
      ...SUBSCRIPTION_COPY.freeFeatures,
      ...HELP_FAQS.flatMap((item) => [item.q, item.a]),
    ].join(' ');

    expect(SUBSCRIPTION_COPY.paidFeatures).toEqual(
      expect.arrayContaining([
        'Daily AI nudge, based on your 12K context',
        'Personal routes under Body, Fuel, Self, or Connection',
        'Cloud sync for daily actions and notes',
        'High-accountability PWA reminders',
        'Anonymous squad matching and weekly pulse when matched',
        'Day 84 cycle reflection',
      ]),
    );
    expect(SUBSCRIPTION_COPY.lifechanger).toContain('deeper personalisation');
    expect(SUBSCRIPTION_COPY.lifechangerFeatures).toEqual(
      expect.arrayContaining([
        'Everything in Kairos Plus',
        'Advanced AI pattern support when history is strong enough',
        'Fallback to standard Kairos support when data is thin',
      ]),
    );
    expect(publicCopy).not.toContain('Brotherhood');
    expect(publicCopy).not.toMatch(/\bmen\b|\bman\b|male/i);
  });

  it('does not promise unsupported billing outcomes while checkout is blocked', () => {
    const text = [
      SUBSCRIPTION_COPY.intro,
      SUBSCRIPTION_COPY.priceSuffix,
      SUBSCRIPTION_COPY.lifechanger,
      TERMS_COPY.subscriptions,
      ...HELP_FAQS.map((item) => item.a),
    ].join(' ');

    expect(text).not.toMatch(/no questions/i);
    expect(text).not.toMatch(/cancel anytime/i);
    expect(text).not.toMatch(/7-day refund/i);
    expect(text).toContain('when checkout is live');
  });

  it('explains paid features without vague coming-soon language', () => {
    const featureCopy = Object.values(FEATURE_EXPLANATIONS).join(' ');

    expect(FEATURE_EXPLANATIONS.personalRoutes).toContain('under one core domain');
    expect(FEATURE_EXPLANATIONS.personalRoutesAction).toContain('Home, Progress, and Improve');
    expect(FEATURE_EXPLANATIONS.squad).toContain('anonymous accountability');
    expect(FEATURE_EXPLANATIONS.notifications).toContain('opt-in PWA prompts');
    expect(FEATURE_EXPLANATIONS.lifechanger).toContain('when there is enough history');
    expect(featureCopy).not.toMatch(/coming soon/i);
  });
});
