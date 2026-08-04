import { HELP_FAQS, SUBSCRIPTION_COPY, TERMS_COPY } from '@/utils/brandCopy';
import { describe, expect, it } from 'vitest';

describe('brand and help copy contract', () => {
  it('covers the expected product-support topics in Help and FAQ', () => {
    const questions = HELP_FAQS.map((item) => item.q);

    expect(questions).toEqual(
      expect.arrayContaining([
        'What is 12K?',
        'What is the Kairos system?',
        'Why Self, not Mind?',
        'What does Connection include?',
        'What does reset do?',
        'How do notifications work?',
        'How does the AI nudge work?',
        'What is Brotherhood?',
        'What is Lifechanger?',
        'Why can I not open checkout?',
      ]),
    );
  });

  it('keeps subscription copy aligned with current V1 capability', () => {
    expect(SUBSCRIPTION_COPY.paidFeatures).toEqual(
      expect.arrayContaining([
        'Daily AI nudge, based on your 12K context',
        'Custom routes under Body, Fuel, Self, or Connection',
        'Cloud sync for daily actions and notes',
        'High-accountability PWA reminders',
        'Day 84 cycle reflection',
      ]),
    );
    expect(SUBSCRIPTION_COPY.lifechanger).toContain('inherits Brotherhood access');
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
});
