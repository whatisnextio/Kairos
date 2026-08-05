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
    tagline: 'Begin with one useful action you can repeat.',
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

export const PUBLIC_DOMAIN_TYPES: DomainType[] = ['BODY', 'FUEL', 'METIME', 'USTIME'];

export interface PrivateRouteTemplate {
  type: DomainType;
  label: string;
  parentDomainType: DomainType;
  description: string;
  focusDescription: string;
}

export const PRIVATE_ROUTE_TEMPLATES: PrivateRouteTemplate[] = [
  {
    type: 'SHOT',
    label: 'SHOT',
    parentDomainType: 'USTIME',
    description: 'Mission/work execution that must support connection rather than replace it.',
    focusDescription: 'One visible move towards profit, salary, or delivery.',
  },
  {
    type: 'LENS',
    label: 'Lens',
    parentDomainType: 'METIME',
    description: 'Creative practice, photography outings, edits, exports, and submissions.',
    focusDescription: 'One photo action: go out, edit, share, or submit.',
  },
  {
    type: 'NEST',
    label: 'Nest',
    parentDomainType: 'USTIME',
    description: 'Home rhythm, fatherhood, family presence, and practical support.',
    focusDescription: 'One present family action that makes home easier.',
  },
  {
    type: 'ROOTS',
    label: 'Roots',
    parentDomainType: 'FUEL',
    description: 'Money, debt, salary, wealth, and long-range optionality foundations.',
    focusDescription: 'One money action that lowers drag or builds optionality.',
  },
];

export const PRODUCT_POSITIONING = {
  appName: '12K',
  systemName: 'Kairos',
  headline: 'Your 12-week transformation. Powered by the Kairos System.',
  what: '12K is a guided 12-week / 84-day operating system for turning daily action into visible change.',
  kairosMeaning:
    'Kairos is Greek for the right or opportune moment: the point where attention becomes action.',
  why: 'It gives you a clear goal, prompts and cues, one check-in, feedback, and a recovery path when the day slips.',
  audience: 'Built for adults who need a simple guided reset, not a gender-specific programme.',
  designedFor:
    'Designed for real life: inconsistent energy, busy work, family pressure, missed days, and the need to rebuild without shame.',
  categoryIntro:
    'Start with Body, Fuel, Self, and Connection. Add private sub-routes when your life needs them.',
  proofLoop:
    'Choose one useful move, do the smallest honest version, check in, recover quickly, and review the flywheel weekly.',
} as const;

export interface DomainConfig {
  type: DomainType;
  label: string;
  colour: string; // tailwind text colour class
  audience: 'public' | 'owner';
  description: string;
  focusPrompt: string;
  question: string;
  focusOptions: string[];
  prepOptions: string[];
  recoveryOptions: string[];
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
      'Take an easy 10-minute walk',
      'Do a simple strength session',
      'Stretch or mobilise for 10 minutes',
      'Choose pain-free mobility only',
      'Protect an earlier bedtime',
    ],
    prepOptions: [
      'Put kit where you will see it',
      'Choose the lower-intensity version first',
      'Block a 20-minute window',
      'Choose the easiest route',
    ],
    recoveryOptions: [
      'Make it a 5-minute mobility floor',
      'Use an easy walk instead of a session',
      'Protect sleep and mark Partial',
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
      'Swap alcohol for a no-alcohol option',
      'Note a food or drink trigger without diagnosing it',
      "Prepare tomorrow's first meal",
    ],
    prepOptions: [
      'Fill a bottle now',
      'Move the better option into reach',
      'Plan the alcohol-free option before evening',
      'Decide the next meal before you are hungry',
    ],
    recoveryOptions: [
      'Drink water before the next choice',
      'Make the next meal protein-first',
      'Write the trigger and reset the next decision',
    ],
    reflectPrompt: 'Which choice gave you energy, and which choice took it?',
    coachPrompt: 'Do not negotiate with hunger late. Set the next choice while you are clear.',
    feedbackPrompt: 'Fuel is a leverage point. One better choice changes the next decision.',
  },
  {
    type: 'METIME',
    label: 'Self',
    colour: 'text-domain-metime',
    audience: 'public',
    description: 'Attention, recovery, identity, reflection, confidence, and emotional regulation.',
    focusPrompt:
      'Pick the reset, reflection, or private check-in that helps you take yourself back.',
    question: 'What would make you feel more in control of yourself today?',
    focusOptions: [
      'Take a 10-minute reset',
      'Write one honest line',
      'Name one visible win',
      'Put the phone away for 30 minutes',
      'Plan a quiet recovery block',
      'Do your private check-in',
    ],
    prepOptions: ['Choose the place', 'Set a short timer', 'Remove the phone from reach'],
    recoveryOptions: [
      'Take a 3-minute breathing reset',
      'Write one honest line and stop',
      'Put the phone away for 10 minutes',
    ],
    reflectPrompt: 'What pulled you off centre, and what brought you back?',
    coachPrompt:
      'Self is broader than mindset. Protect attention, recovery, confidence, and identity.',
    feedbackPrompt: 'Self is the base layer. When you are regulated, the other choices get easier.',
  },
  {
    type: 'USTIME',
    label: 'Connection',
    colour: 'text-domain-ustime',
    audience: 'public',
    description:
      'Family, friends, partners, community, communication, warmth, and practical support.',
    focusPrompt: 'Choose one relationship action that makes connection easier.',
    question: 'Who needs a more present version of you today?',
    focusOptions: [
      'Check their energy first',
      'Have a no-phone conversation',
      'Do one useful household action',
      'Offer warmth with no agenda',
      'Ask a better question and listen',
      'Be present with family for 15 minutes',
    ],
    prepOptions: ['Name the person', 'Choose the moment', 'Keep it small and specific'],
    recoveryOptions: [
      'Send one low-pressure check-in',
      'Do one practical help action',
      'Offer simple support with no agenda',
    ],
    reflectPrompt: 'Where did you create warmth, safety, or attention?',
    coachPrompt: 'Connection starts with the other person as they are today.',
    feedbackPrompt: 'The point is not pressure or grand gestures. It is reliable presence.',
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
    recoveryOptions: [
      'Close one visible loop',
      'Send one follow-up',
      'Reset the next SHOT decision',
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
    recoveryOptions: ['Edit one keeper', 'Study one reference frame', 'Plan the next short outing'],
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
    recoveryOptions: [
      'One shoulder-to-shoulder moment',
      'Tidy one friction point',
      'Ask what would help now',
    ],
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
    recoveryOptions: ['Check one balance', 'Write the next money decision', 'Close one admin loop'],
    reflectPrompt: 'What became more stable because of today?',
    coachPrompt: 'Roots is about reducing future drag. Close one loop at a time.',
    feedbackPrompt: 'Roots is a private route for Liam, not a default public promise.',
    focusPrompt: 'Debt clear. Capital building. Portugal fund.',
  },
];

// ─── Account access ──────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'brotherhood' | 'lifechanger';

export function isOwnerAccount(email?: string | null): boolean {
  return email?.trim().toLowerCase() === 'ldgmcdowell@gmail.com';
}

export function getAvailableDomains(_email?: string | null): DomainConfig[] {
  return DOMAINS.filter((domain) => PUBLIC_DOMAIN_TYPES.includes(domain.type));
}

export function getDomainConfig(type: DomainType, email?: string | null): DomainConfig | undefined {
  return getAvailableDomains(email).find((domain) => domain.type === type);
}

const DOMAIN_ROUTE_SLUGS: Record<DomainType, string> = {
  BODY: 'body',
  FUEL: 'fuel',
  METIME: 'self',
  USTIME: 'connection',
  SHOT: 'shot',
  LENS: 'lens',
  NEST: 'nest',
  ROOTS: 'roots',
};

const DOMAIN_TYPES_BY_ROUTE_SLUG: Record<string, DomainType> = {
  body: 'BODY',
  fuel: 'FUEL',
  self: 'METIME',
  connection: 'USTIME',
  metime: 'METIME',
  ustime: 'USTIME',
  shot: 'SHOT',
  lens: 'LENS',
  nest: 'NEST',
  roots: 'ROOTS',
};

export function getDomainRouteSlug(type: DomainType): string {
  return DOMAIN_ROUTE_SLUGS[type];
}

export function getDomainTypeFromRouteSlug(slug?: string | null): DomainType | undefined {
  if (!slug) return undefined;
  return DOMAIN_TYPES_BY_ROUTE_SLUG[slug.trim().toLowerCase()];
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
  {
    id: 'provider',
    name: 'The Provider',
    description: 'You create stability through money, energy, and daily presence.',
  },
  {
    id: 'builder',
    name: 'The Builder',
    description: 'You turn plans into systems, shipped work, and visible progress.',
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    description: 'You protect health, family, boundaries, and the standards that hold.',
  },
  {
    id: 'leader',
    name: 'The Leader',
    description: 'You set direction, make decisions, and bring others with you.',
  },
  {
    id: 'mentor',
    name: 'The Mentor',
    description: 'You use earned lessons to guide, teach, and steady someone else.',
  },
  {
    id: 'creator',
    name: 'The Creator',
    description: 'You make art, stories, photos, or content that carries meaning.',
  },
  { id: 'custom', name: 'Custom', description: 'Use your own words if none of these fit.' },
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

export interface CustomRoute {
  id: string;
  userId: string;
  cycleId: string;
  parentDomainType: DomainType;
  label: string;
  description: string;
  focusDescription: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CustomRouteCheckIn {
  id: string;
  userId: string;
  cycleId: string;
  routeId: string;
  date: string;
  status: CheckInStatus;
  notes: string | null;
  xpAwarded: number;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyArchiveEntry {
  id: string;
  archivedAt: string;
  reason: CycleStatus;
  cycleId: string | null;
  startDate: string | null;
  endDate: string;
  xp: number;
  domainFocuses: Array<{
    domainType: DomainType;
    focusDescription: string;
  }>;
  customRoutes: Array<{
    parentDomainType: DomainType;
    label: string;
    description: string;
    focusDescription: string;
  }>;
  checkInHistory: Record<string, Partial<Record<DomainType, CheckInStatus>>>;
  customRouteCheckInHistory: Record<string, Record<string, CheckInStatus>>;
  streakProtectionHistory?: Record<string, true>;
  awardedWeeklyBonuses?: Record<string, true>;
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
  cycleId: string | null;
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

export interface ImproveCardSnapshot {
  id: string;
  lens: string;
  title: string;
  body: string;
  domainLabel: string;
  phaseLabel: string;
  actionText: string;
  whyText?: string;
  xpReward: number;
  cta: NudgeCta;
  reflectionText?: string;
  domainType?: DomainType;
  customRouteId?: string;
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

export const XP_PER_CHECK_IN_DONE = 25;
export const XP_PER_CHECK_IN_PARTIAL = 10;
export const XP_PER_WEEK_COMPLETE = 100;
export const XP_PER_CYCLE_COMPLETE = 500;

export type BadgeId =
  | 'first-proof'
  | 'full-house'
  | 'seven-day-flywheel'
  | 'protected-rhythm'
  | 'challenge-closed'
  | 'cycle-finisher';

export interface EarnedBadge {
  id: BadgeId;
  label: string;
  description: string;
  trigger: string;
  earned: boolean;
}

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
