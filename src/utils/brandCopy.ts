import { PRODUCT_POSITIONING } from '@/types';

export const AUTH_COPY = {
  headline: 'Start with one small action.',
  body: 'Choose Body, Fuel, Self, and Connection. Check in once a day and keep going.',
} as const;

export const HELP_FAQS = [
  {
    q: 'What is 12K?',
    a: PRODUCT_POSITIONING.what,
  },
  {
    q: 'What does 12K stand for?',
    a: '12K means 12 weeks powered by Kairos. It is not 12 steps. It helps you work through Body, Fuel, Self, and Connection for 84 days.',
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
    a: 'No. Choose a useful action, do it, mark what happened, and review the pattern each week.',
  },
  {
    q: 'What is the Kairos system?',
    a: `${PRODUCT_POSITIONING.kairosMeaning} The plan uses six 14-day phases: Kickoff, Anchor, Increase, Rhythm, Own, and Sustain. The daily loop is: ${PRODUCT_POSITIONING.proofLoop}`,
  },
  {
    q: 'What research is it based on?',
    a: 'Kairos uses established behaviour-change ingredients: clear goals, prompts and cues, self-monitoring, feedback, repetition, rewards, and recovery after lapses. It is support, not medical advice.',
  },
  {
    q: 'What are the four areas?',
    a: PRODUCT_POSITIONING.categoryIntro,
  },
  {
    q: 'Why Self, not Mind?',
    a: 'Self covers attention, rest, confidence, mood, and the private check-ins that help you feel steady.',
  },
  {
    q: 'What does Connection include?',
    a: 'Connection covers family, friends, partners, community, communication, warmth, comfort, and practical support. It should support presence, not pressure.',
  },
  {
    q: 'Can I add extra actions?',
    a: 'Yes. Add work, money, photography, family, study, or recovery as extra actions under Body, Fuel, Self, or Connection.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'The day is not failed. Mark Done, Part done, Missed, or Protected where available. Then choose the next small useful action.',
  },
  {
    q: 'What does reset do?',
    a: 'Reset starts onboarding again and creates a new journey. Your active progress resets, but past journey history and app memory are kept.',
  },
  {
    q: 'How do notifications work?',
    a: 'Reminders are opt-in where your device supports them. Extra support adds more simple prompts through the day, including early start, catch-up, and evening planning.',
  },
  {
    q: 'How does the extra prompt work?',
    a: 'It suggests short actions from your plan, reminders, check-ins, and extra actions. It is not a chat app or professional advice.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Labels stay discreet, private actions are not public defaults, and the app does not sell your data. See the Privacy Policy for the full position.',
  },
] as const;

export const FEATURE_EXPLANATIONS = {
  personalRoutes:
    'Add work, money, photography, family, study, or recovery as an extra action under one core area. The plan stays Body, Fuel, Self, and Connection.',
  personalRoutesAction:
    'After you add an extra action, it can appear in Home, Progress, and Improve as its own line.',
  squad:
    'Squad is anonymous accountability, not chat. The match action places you with people in the same Kairos phase and shows a weekly pulse when one is available.',
  notifications:
    'Reminders are opt-in device prompts. Extra support adds more simple check-ins inside your chosen hours.',
} as const;

export const PRIVACY_COPY = {
  intro:
    '12K is private by design. It stores only what is needed to run your 84-day journey, sync the app, and keep it useful.',
  collected:
    'Email, date of birth for 18+ checks, profile setup, check-ins, action choices, notes including health-related notes you choose to add, Kairos Points, streaks, notification preferences, and journey state.',
  notDone:
    'We do not sell your data, use advertising networks, or make private action labels public. Supabase stores app data, and Plausible measures usage without cookies.',
  rights:
    'You can export your data and request account deletion from the You screen. For access questions or support-led requests, contact support and we will respond within 30 days.',
} as const;

export const TERMS_COPY = {
  intro: 'By using 12K you agree to use it as a personal operating system, not medical advice.',
  ai: 'AI prompts are supportive suggestions generated from your 12K context. They are not medical, psychological, financial, or legal advice.',
} as const;
