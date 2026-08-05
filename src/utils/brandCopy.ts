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
    q: 'What does 12K stand for?',
    a: '12K means 12 weeks powered by Kairos. It is not 12 steps. It is a six-phase, 84-day reset across Body, Fuel, Self, and Connection.',
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
    a: `${PRODUCT_POSITIONING.kairosMeaning} The system uses six 14-day phases: Kickoff, Anchor, Increase, Rhythm, Own, and Sustain. The daily loop is: ${PRODUCT_POSITIONING.proofLoop}`,
  },
  {
    q: 'What research is it based on?',
    a: 'Kairos uses established behaviour-change ingredients: clear goals, prompts and cues, self-monitoring, feedback, repetition, rewards, and recovery after lapses. It is support, not medical advice.',
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
    a: 'Yes. Routes such as photography, work, money, or family projects sit under the four core domains so the public framework stays consistent.',
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
    a: 'Notifications are opt-in PWA prompts where your browser supports them. High accountability repeats structured prompts through the day, including early protocol, catch-up, and shutdown.',
  },
  {
    q: 'How does the AI nudge work?',
    a: 'AI nudges use your identity anchor, phase, recent check-ins, streaks, and active routes. They stay short, supportive, and grounded in your current 12K context.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Labels stay discreet, your private sub-routes are not public defaults, and the app does not sell your data. See the Privacy Policy for the full position.',
  },
] as const;

export const FEATURE_EXPLANATIONS = {
  personalRoutes:
    'Add work, money, photography, family, or any private focus as a sub-route under one core domain. The framework stays Body, Fuel, Self, and Connection; your sub-routes make it personal.',
  personalRoutesAction:
    'After you add a sub-route, it can appear in Home, Progress, and Improve as its own proof line.',
  squad:
    'Squad is anonymous accountability, not chat. The match action places you with people in the same Kairos phase and shows a weekly pulse when one is available.',
  notifications:
    'Notifications are opt-in PWA prompts. High accountability repeats discreet check-in prompts inside your chosen hours.',
} as const;

export const PRIVACY_COPY = {
  intro:
    '12K is private by design. It stores only what is needed to run your 84-day journey, sync the app, and keep it useful.',
  collected:
    'Email, date of birth for 18+ checks, profile setup, check-ins, route choices, notes, Kairos Points, streaks, notification preferences, and cycle state.',
  notDone:
    'We do not sell your data, use advertising networks, or make private route labels public. Supabase stores app data, and Plausible measures usage without cookies.',
  rights:
    'You can export your data and request account deletion from the You screen. For access questions or support-led requests, contact support and we will respond within 30 days.',
} as const;

export const TERMS_COPY = {
  intro: 'By using 12K you agree to use it as a personal operating system, not medical advice.',
  ai: 'AI nudges are supportive prompts generated from your 12K context. They are not medical, psychological, financial, or legal advice.',
} as const;
