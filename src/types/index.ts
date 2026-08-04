// ─── KAIROS Phases ───────────────────────────────────────────────────────────

export const KAIROS_CYCLE_LENGTH_DAYS = 84;

export type KairosPhase = 'KICKOFF' | 'ANCHOR' | 'INCREASE' | 'RHYTHM' | 'OWN' | 'SUSTAIN';

export interface KairosPhaseConfig {
  phase: KairosPhase;
  label: string;
  days: [number, number]; // [startDay, endDay] inclusive, 1-indexed
  tagline: string;
}

export const KAIROS_PHASES: KairosPhaseConfig[] = [
  {
    phase: 'KICKOFF',
    label: 'Kickoff',
    days: [1, 14],
    tagline: 'Start small. Create the first visible win.',
  },
  {
    phase: 'ANCHOR',
    label: 'Anchor',
    days: [15, 28],
    tagline: 'Make the habit easy to find, repeat, and protect.',
  },
  {
    phase: 'INCREASE',
    label: 'Increase',
    days: [29, 42],
    tagline: 'Add controlled load without breaking the floor.',
  },
  {
    phase: 'RHYTHM',
    label: 'Rhythm',
    days: [43, 56],
    tagline: 'Turn good days into a repeatable weekly pattern.',
  },
  {
    phase: 'OWN',
    label: 'Own',
    days: [57, 70],
    tagline: 'Remove friction. Make the behaviour feel like yours.',
  },
  {
    phase: 'SUSTAIN',
    label: 'Sustain',
    days: [71, 84],
    tagline: 'Hold the gain and choose the next cycle deliberately.',
  },
];

// ─── Domains ─────────────────────────────────────────────────────────────────

export type DomainType = 'BODY' | 'FUEL' | 'METIME' | 'USTIME' | 'SHOT' | 'LENS' | 'NEST' | 'ROOTS';

export interface DomainConfig {
  type: DomainType;
  label: string;
  ownerLabel?: string;
  colour: string; // tailwind text colour class
  audience: 'public' | 'owner';
  description: string;
  focusPrompt: string;
  question: string;
  focusOptions: string[];
  prepOptions: string[];
  reflectPrompt: string;
  coachPrompt: string;
  feedbackPrompt: string;
}

export const DOMAINS: DomainConfig[] = [
  {
    type: 'BODY',
    label: 'Body',
    colour: 'text-domain-body',
    audience: 'public',
    description: 'Movement, sleep, recovery, strength, and physical energy.',
    focusPrompt: 'Choose one physical action you can repeat without drama.',
    question: 'What physical action would make today harder to waste?',
    focusOptions: [
      'Walk for 20 minutes',
      'Do a simple strength session',
      'Stretch or mobilise for 10 minutes',
      'Protect an earlier bedtime',
    ],
    prepOptions: [
      'Put kit where you will see it',
      'Block a 20-minute window',
      'Choose the easiest route',
    ],
    reflectPrompt: 'What did your body need today, and did you answer it?',
    coachPrompt: 'If energy is low, shrink the action before you skip it.',
    feedbackPrompt: 'Body is not punishment. It is the daily signal that you are in the game.',
  },
  {
    type: 'FUEL',
    label: 'Fuel',
    colour: 'text-domain-fuel',
    audience: 'public',
    description: 'Food, water, alcohol, caffeine, and choices that affect mood and energy.',
    focusPrompt: 'Pick the next food or drink decision that helps future you.',
    question: 'What fuel choice gives you the cleanest next few hours?',
    focusOptions: [
      'Drink water before caffeine',
      'Make the next meal protein-first',
      'Avoid alcohol today',
      "Prepare tomorrow's first meal",
    ],
    prepOptions: [
      'Fill a bottle now',
      'Move the better option into reach',
      'Decide the next meal before you are hungry',
    ],
    reflectPrompt: 'Which choice gave you energy, and which choice took it?',
    coachPrompt: 'Do not negotiate with hunger late. Set the next choice while you are clear.',
    feedbackPrompt: 'Fuel is a leverage point. One better choice changes the next decision.',
  },
  {
    type: 'METIME',
    label: 'Mind',
    ownerLabel: 'Me Time',
    colour: 'text-domain-metime',
    audience: 'public',
    description: 'Attention, recovery, self-respect, quiet time, and emotional regulation.',
    focusPrompt: 'Pick a reset that gives your head some room.',
    question: 'What would make you feel less hijacked by the day?',
    focusOptions: [
      'Take a 10-minute reset',
      'Write one honest line',
      'Read 10 pages',
      'Put the phone down by 21:30',
    ],
    prepOptions: ['Choose the place', 'Set a short timer', 'Remove the phone from reach'],
    reflectPrompt: 'Where did your attention go, and what pulled it back?',
    coachPrompt: 'Recovery works best when it is planned before you need it.',
    feedbackPrompt: 'A calmer mind is not a luxury. It is the base for better choices.',
  },
  {
    type: 'USTIME',
    label: 'Connection',
    ownerLabel: 'Us Time',
    colour: 'text-domain-ustime',
    audience: 'public',
    description: 'Relationships, presence, useful communication, and small acts that build trust.',
    focusPrompt: 'Choose one relationship action that shows presence.',
    question: 'Who needs a better version of you today?',
    focusOptions: [
      'Send the message',
      'Have a no-phone conversation',
      'Do one useful household action',
      'Ask a better question and listen',
    ],
    prepOptions: ['Name the person', 'Choose the moment', 'Keep it small and specific'],
    reflectPrompt: 'Where were you present, and where did you go missing?',
    coachPrompt: 'Connection improves through small, visible deposits.',
    feedbackPrompt: 'The point is not grand gestures. It is reliable presence.',
  },
  {
    type: 'SHOT',
    label: 'Shot',
    colour: 'text-domain-shot',
    audience: 'owner',
    description: 'Liam-only SHOT execution, commercial delivery, and product momentum.',
    question: 'What SHOT action compounds the most today?',
    focusOptions: [
      'Advance one live deal',
      'Ship one delivery blocker',
      'Follow up one commercial lead',
      'Protect 10-3 execution',
    ],
    prepOptions: [
      'Open the live board',
      'Choose the one blocker',
      'Write the follow-up before context switching',
    ],
    reflectPrompt: 'What moved SHOT forwards in a way that can be seen?',
    coachPrompt: 'Prefer cash, shipped proof, and real user evidence over busy work.',
    feedbackPrompt: 'SHOT is a private route. It should never be forced onto normal users.',
    focusPrompt: '10-3 model. Pipeline. Salary by December.',
  },
  {
    type: 'LENS',
    label: 'Lens',
    colour: 'text-domain-lens',
    audience: 'owner',
    description: 'Liam-only photography, creative practice, and visual output.',
    question: 'What would make Lens real today?',
    focusOptions: [
      'Edit one keeper',
      'Plan the next dawn shoot',
      'Share one image',
      'Study one reference frame',
    ],
    prepOptions: ['Charge the kit', 'Choose the location', 'Make the next image easy to find'],
    reflectPrompt: 'What did you notice that you would usually miss?',
    coachPrompt: 'The creative habit survives on scheduled output, not mood.',
    feedbackPrompt: 'Lens stays private to Liam unless another user creates their own route.',
    focusPrompt: 'Dawn shoot monthly. Weekly out. Competition entered.',
  },
  {
    type: 'NEST',
    label: 'Nest',
    colour: 'text-domain-nest',
    audience: 'owner',
    description: 'Liam-only family presence, home rhythm, and fatherhood routes.',
    question: 'What makes home feel safer or warmer today?',
    focusOptions: [
      'One shoulder-to-shoulder moment',
      'One game or football moment',
      'Tidy one friction point',
      'Ask what they need',
    ],
    prepOptions: ['Pick the child or room', 'Clear 15 minutes', 'Remove the phone'],
    reflectPrompt: 'Where did you make home easier for someone else?',
    coachPrompt: 'Small consistent attention beats a dramatic catch-up.',
    feedbackPrompt: 'Nest is Liam-specific context and should not appear in the generic product.',
    focusPrompt: 'Eldest shoulder-to-shoulder. Youngest football or games.',
  },
  {
    type: 'ROOTS',
    label: 'Roots',
    colour: 'text-domain-roots',
    audience: 'owner',
    description: 'Liam-only money, foundations, debt, and long-term optionality.',
    question: 'What foundation needs a decision today?',
    focusOptions: [
      'Check one account',
      'Move money intentionally',
      'Close one admin loop',
      'Protect the Portugal fund',
    ],
    prepOptions: ['Open the account', 'Set the number', 'Write the next decision down'],
    reflectPrompt: 'What became more stable because of today?',
    coachPrompt: 'Roots is about reducing future drag. Close one loop at a time.',
    feedbackPrompt: 'Roots is a private route for Liam, not a default public promise.',
    focusPrompt: 'Debt clear. Capital building. Portugal fund.',
  },
];

// ─── Subscription ────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'brotherhood';

export function isOwnerAccount(email?: string | null): boolean {
  return email?.trim().toLowerCase() === 'ldgmcdowell@gmail.com';
}

export function getAvailableDomains(email?: string | null): DomainConfig[] {
  const owner = isOwnerAccount(email);
  return DOMAINS.filter((domain) => owner || domain.audience === 'public').map((domain) =>
    owner && domain.ownerLabel ? { ...domain, label: domain.ownerLabel } : domain,
  );
}

export function getDomainConfig(type: DomainType, email?: string | null): DomainConfig | undefined {
  return getAvailableDomains(email).find((domain) => domain.type === type);
}

// ─── Identity Anchor ─────────────────────────────────────────────────────────

export type IdentityAnchorId =
  | 'provider'
  | 'builder'
  | 'guardian'
  | 'leader'
  | 'mentor'
  | 'creator'
  | 'custom';

export interface IdentityAnchor {
  id: IdentityAnchorId;
  name: string;
  description: string;
}

export const IDENTITY_ANCHORS: IdentityAnchor[] = [
  { id: 'provider', name: 'The Provider', description: 'You show up. Every day. No excuses.' },
  {
    id: 'builder',
    name: 'The Builder',
    description: 'You make things real that others only imagine.',
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    description: 'You protect what matters. Family, health, standards.',
  },
  { id: 'leader', name: 'The Leader', description: 'Others follow because you go first.' },
  {
    id: 'mentor',
    name: 'The Mentor',
    description: "Your hard-won lessons become someone else's shortcut.",
  },
  { id: 'creator', name: 'The Creator', description: 'You build worlds with your hands or mind.' },
  { id: 'custom', name: 'Custom', description: 'Define your own.' },
];

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  displayName: string;
  identityAnchorId: IdentityAnchorId;
  customAnchorName?: string;
  tier: SubscriptionTier;
  xp: number;
  currentKairosCycleId: string | null;
  dateOfBirth: string; // ISO date
  squadId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null; // ISO datetime
  createdAt: string;
  updatedAt: string;
}

// ─── Cycle ───────────────────────────────────────────────────────────────────

export type CycleStatus = 'active' | 'completed' | 'abandoned';

export interface KairosCycle {
  id: string;
  userId: string;
  startDate: string; // ISO date
  endDate: string | null;
  status: CycleStatus;
  totalXpEarned: number;
  completionPercentage: number;
  createdAt: string;
}

// ─── Domain Focus ─────────────────────────────────────────────────────────────

export interface UserDomainFocus {
  id: string;
  userId: string;
  cycleId: string;
  domainType: DomainType;
  focusDescription: string;
  setAt: string;
}

// ─── Check-in ────────────────────────────────────────────────────────────────

export type CheckInStatus = 'Done' | 'Partial' | 'Missed' | 'Pending' | 'Protected';

export interface DailyCheckIn {
  id: string;
  userId: string;
  cycleId: string;
  date: string; // ISO date
  domainType: DomainType;
  status: CheckInStatus;
  notes: string | null;
  xpAwarded: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Streaks ──────────────────────────────────────────────────────────────────

export interface UserStreak {
  userId: string;
  domainType: DomainType;
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
}

// ─── Vibe Check ───────────────────────────────────────────────────────────────

export interface VibeCheck {
  id: string;
  userId: string;
  cycleId: string;
  date: string;
  rating: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

// ─── AI Nudge ────────────────────────────────────────────────────────────────

export type NudgeType = 'daily_nudge' | 'weekly_challenge' | 'squad_pulse' | 'cycle_reflection';
export type NudgeStatus = 'new' | 'accepted' | 'completed' | 'dismissed';
export type NudgeCta = 'check_in_now' | 'reflect' | 'plan_tomorrow' | null;

export interface AiNudge {
  id: string;
  userId: string;
  date: string;
  type: NudgeType;
  title: string;
  body: string;
  domainType: DomainType | null;
  kairosPhase: KairosPhase | null;
  xpReward: number | null;
  status: NudgeStatus;
  cta: NudgeCta;
  generatedAt: string;
}

// ─── Squad ───────────────────────────────────────────────────────────────────

export interface Squad {
  id: string;
  kairosPhase: KairosPhase;
  cycleStartWindow: string;
  memberCount: number;
  createdAt: string;
}

export interface SquadPulse {
  id: string;
  squadId: string;
  weekNumber: number;
  message: string;
  generatedAt: string;
}

// ─── XP / Gamification ───────────────────────────────────────────────────────

export const XP_PER_CHECK_IN_DONE = 10;
export const XP_PER_CHECK_IN_PARTIAL = 5;
export const XP_PER_CYCLE_COMPLETE = 500;

export interface XpLevel {
  level: number;
  label: string;
  minXp: number;
  maxXp: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}
