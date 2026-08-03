// ─── KAIROS Phases ───────────────────────────────────────────────────────────

export type KairosPhase = 'GATE' | 'STABILISE' | 'BUILD' | 'PERFORM' | 'ELITE';

export interface KairosPhaseConfig {
  phase: KairosPhase;
  label: string;
  days: [number, number]; // [startDay, endDay] inclusive, 1-indexed
  tagline: string;
}

export const KAIROS_PHASES: KairosPhaseConfig[] = [
  {
    phase: 'GATE',
    label: 'Gate',
    days: [1, 7],
    tagline: 'Phase 0. Foundations set. Nothing else starts until this closes.',
  },
  {
    phase: 'STABILISE',
    label: 'Stabilise',
    days: [8, 56],
    tagline: 'Floor unbroken. Weight trending. First month banked.',
  },
  {
    phase: 'BUILD',
    label: 'Build',
    days: [57, 151],
    tagline: 'Strength proper. Running back. December gate.',
  },
  {
    phase: 'PERFORM',
    label: 'Perform',
    days: [152, 217],
    tagline: 'Cambridge Half peaks. Tom Hardy mode approaching.',
  },
  {
    phase: 'ELITE',
    label: 'Elite',
    days: [218, 365],
    tagline: 'The campaign ends or Liam 43 gets bigger targets.',
  },
];

// ─── Domains ─────────────────────────────────────────────────────────────────

export type DomainType = 'BODY' | 'FUEL' | 'METIME' | 'USTIME' | 'SHOT' | 'LENS' | 'NEST' | 'ROOTS';

export interface DomainConfig {
  type: DomainType;
  label: string;
  colour: string; // tailwind text colour class
  focusPrompt: string;
}

export const DOMAINS: DomainConfig[] = [
  {
    type: 'BODY',
    label: 'Body',
    colour: 'text-domain-body',
    focusPrompt: 'Walk daily. Train 4x week. Knee first, then run.',
  },
  {
    type: 'FUEL',
    label: 'Fuel',
    colour: 'text-domain-fuel',
    focusPrompt: 'Supplements AM. No alcohol. No bread. Water first.',
  },
  {
    type: 'METIME',
    label: 'Me Time',
    colour: 'text-domain-metime',
    focusPrompt: 'Scheduled. Private. Non-negotiable.',
  },
  {
    type: 'USTIME',
    label: 'Us Time',
    colour: 'text-domain-ustime',
    focusPrompt: 'Morning warmth. Intentional. Her pace.',
  },
  {
    type: 'SHOT',
    label: 'Shot',
    colour: 'text-domain-shot',
    focusPrompt: '10–3 model. Pipeline. Salary by December.',
  },
  {
    type: 'LENS',
    label: 'Lens',
    colour: 'text-domain-lens',
    focusPrompt: 'Dawn shoot monthly. Weekly out. Competition entered.',
  },
  {
    type: 'NEST',
    label: 'Nest',
    colour: 'text-domain-nest',
    focusPrompt: 'Eldest shoulder-to-shoulder. Youngest football or games.',
  },
  {
    type: 'ROOTS',
    label: 'Roots',
    colour: 'text-domain-roots',
    focusPrompt: 'Debt clear. Capital building. Portugal fund.',
  },
];

// ─── Subscription ────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'brotherhood';

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
