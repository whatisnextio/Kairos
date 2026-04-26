// ─── KAIROS Phases ───────────────────────────────────────────────────────────

export type KairosPhase =
  | 'KICKOFF'
  | 'ANCHOR'
  | 'INCREASE'
  | 'RHYTHM'
  | 'OWN'
  | 'SUSTAIN';

export interface KairosPhaseConfig {
  phase: KairosPhase;
  label: string;
  days: [number, number]; // [startDay, endDay] inclusive, 1-indexed
  tagline: string;
}

export const KAIROS_PHASES: KairosPhaseConfig[] = [
  { phase: 'KICKOFF',  label: 'Kickoff',  days: [1,  14], tagline: 'Build the base. Consistency over perfection.' },
  { phase: 'ANCHOR',   label: 'Anchor',   days: [15, 28], tagline: 'Lock in habits. Streak matters now.' },
  { phase: 'INCREASE', label: 'Increase', days: [29, 42], tagline: 'Step up intensity. 10-15% more.' },
  { phase: 'RHYTHM',   label: 'Rhythm',   days: [43, 56], tagline: 'Find natural flow. Variability welcome.' },
  { phase: 'OWN',      label: 'Own',      days: [57, 70], tagline: 'Identity crystallisation. You are this now.' },
  { phase: 'SUSTAIN',  label: 'Sustain',  days: [71, 84], tagline: 'Plan the long game. Beyond the cycle.' },
];

// ─── Domains ─────────────────────────────────────────────────────────────────

export type DomainType = 'BODY' | 'LOVE' | 'MISSION' | 'SPIRIT';

export interface DomainConfig {
  type: DomainType;
  label: string;
  colour: string; // tailwind text colour class
}

export const DOMAINS: DomainConfig[] = [
  { type: 'BODY',    label: 'Body',    colour: 'text-domain-body' },
  { type: 'LOVE',    label: 'Love',    colour: 'text-domain-love' },
  { type: 'MISSION', label: 'Mission', colour: 'text-domain-mission' },
  { type: 'SPIRIT',  label: 'Spirit',  colour: 'text-domain-spirit' },
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
  { id: 'provider', name: 'The Provider',  description: 'You show up. Every day. No excuses.' },
  { id: 'builder',  name: 'The Builder',   description: 'You make things real that others only imagine.' },
  { id: 'guardian', name: 'The Guardian',  description: 'You protect what matters. Family, health, standards.' },
  { id: 'leader',   name: 'The Leader',    description: 'Others follow because you go first.' },
  { id: 'mentor',   name: 'The Mentor',    description: 'Your hard-won lessons become someone else\'s shortcut.' },
  { id: 'creator',  name: 'The Creator',   description: 'You build worlds with your hands or mind.' },
  { id: 'custom',   name: 'Custom',        description: 'Define your own.' },
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
  createdAt: string;
  updatedAt: string;
}

// ─── Cycle ───────────────────────────────────────────────────────────────────

export type CycleStatus = 'active' | 'completed' | 'reset' | 'abandoned';

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

export interface SquadMember {
  identityAnchorId: IdentityAnchorId;
  customAnchorName?: string;
  nameInitial: string;
  todayCheckIns: Record<DomainType, CheckInStatus | null>;
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
export const XP_PER_CHALLENGE_COMPLETE = 25;
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
