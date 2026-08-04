import { PRODUCT_POSITIONING } from '@/types';

export const AUTH_COPY = {
  headline: '12 weeks. Four domains. Daily proof.',
  body: '12K uses Kairos to turn Body, Fuel, Self, and Connection into one clear daily operating loop.',
} as const;

export const HELP_FAQS = [
  {
    q: 'What is 12K?',
    a: PRODUCT_POSITIONING.what,
  },
  {
    q: 'Why will it help me?',
    a: PRODUCT_POSITIONING.why,
  },
  {
    q: 'What is it designed for?',
    a: PRODUCT_POSITIONING.designedFor,
  },
  {
    q: 'Is this a habit tracker?',
    a: 'No. The check-ins are proof points. The product is a guided 84-day operating system: plan the next useful move, act, recover when the day slips, then review the flywheel.',
  },
  {
    q: 'What is the Kairos system?',
    a: 'Kairos is the six-phase arc behind the 84 days: Kickoff, Anchor, Increase, Rhythm, Own, and Sustain. Each phase lasts 14 days and changes the coaching emphasis.',
  },
  {
    q: 'What are the core domains?',
    a: PRODUCT_POSITIONING.categoryIntro,
  },
  {
    q: 'Why Self, not Mind?',
    a: 'Self is broader than mindset. It covers attention, recovery, reflection, identity, mood, confidence, emotional regulation, and discreet private check-ins.',
  },
  {
    q: 'What does Connection include?',
    a: 'Connection covers partner, family, affection, communication, practical support, comfort, and consent-led closeness. It should support presence, not pressure.',
  },
  {
    q: 'Can I add my own routes?',
    a: 'Yes on paid tiers. Routes such as photography, work, money, or family projects sit under the four core domains so the public framework stays consistent.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'The day is not failed. Mark Done, Partial, Missed, or Protected where available, then use the catch-up prompt to close one useful loop.',
  },
  {
    q: 'What does reset do?',
    a: 'Reset starts onboarding again and creates a new journey. Your active progress resets, but past journey history and app memory are kept.',
  },
  {
    q: 'How do notifications work?',
    a: 'Paid users can opt into discreet PWA reminders. High accountability repeats structured prompts through the day, including early protocol, catch-up, and shutdown.',
  },
  {
    q: 'How does the AI nudge work?',
    a: 'AI nudges use your identity anchor, phase, recent check-ins, streaks, and active routes. Brotherhood gets daily nudges. Free gets a Sunday nudge.',
  },
  {
    q: 'What is Brotherhood?',
    a: 'Brotherhood unlocks the full V1 loop: daily AI nudges, paid progress depth, cloud sync, custom routes, push reminders, anonymous squad signals, and the Day 84 reflection.',
  },
  {
    q: 'What is Lifechanger?',
    a: 'Lifechanger is reserved for deeper personalisation. In V1 it inherits Brotherhood access until the advanced AI coaching rules are shipped.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Labels stay discreet, your private routes are not public defaults, and the app does not sell your data. See the Privacy Policy for the full position.',
  },
  {
    q: 'Why can I not open checkout?',
    a: 'If checkout is unavailable, the app will show an error instead of failing silently. Billing becomes live when the Stripe checkout URL is configured.',
  },
] as const;

export const SUBSCRIPTION_COPY = {
  title: 'Brotherhood',
  intro: 'The full V1 12K loop: daily prompts, deeper progress, cloud sync, and private routes.',
  price: '£7.99',
  priceSuffix: 'per month when checkout is live.',
  paidFeatures: [
    'Daily AI nudge, based on your 12K context',
    'Custom routes under Body, Fuel, Self, or Connection',
    'Cloud sync for daily actions and notes',
    'High-accountability PWA reminders',
    'Full XP, streak, badge, and history depth',
    'Anonymous squad signals when matched',
    'Day 84 cycle reflection',
  ],
  freeFeatures: [
    'Track the four core domains',
    'Local device progress',
    'Basic progress rings',
    'Weekly Vibe Check',
    'Sunday AI nudge',
  ],
  lifechanger:
    'Lifechanger is planned for advanced personalisation. In V1 it inherits Brotherhood access without extra claims.',
} as const;

export const PRIVACY_COPY = {
  intro:
    '12K is private by design. It stores only what is needed to run your 84-day journey, sync paid features, and keep the app useful.',
  collected:
    'Email, date of birth for 18+ checks, profile setup, check-ins, route choices, notes, XP, streaks, notification preferences, and cycle state.',
  notDone:
    'We do not sell your data, use advertising networks, or make private route labels public. Supabase stores app data, Stripe handles payments when billing is live, and Plausible measures usage without cookies.',
  rights:
    'You can export your local data from the You screen. For deletion or access requests, contact support and we will respond within 30 days.',
} as const;

export const TERMS_COPY = {
  intro: 'By using 12K you agree to use it as a personal operating system, not medical advice.',
  subscriptions:
    'Paid access is managed through Stripe when checkout is configured. Prices, cancellation, and refund terms are shown at checkout or confirmed by support.',
  ai: 'AI nudges are supportive prompts generated from your 12K context. They are not medical, psychological, financial, or legal advice.',
} as const;
