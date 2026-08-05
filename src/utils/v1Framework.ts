import type { CheckInStatus, DailyCheckIn, DomainConfig, DomainType } from '@/types';
import { getAvailableDomains } from '@/types';

export interface EarlyWakeProtocol {
  title: string;
  body: string;
  steps: string[];
}

export interface CatchUpPath {
  title: string;
  body: string;
  domainType: DomainType;
  domainLabel: string;
  steps: string[];
}

export interface AccountabilityPrompt {
  level: 1 | 2 | 3;
  title: string;
  body: string;
  steps: string[];
}

export interface FlywheelEntry {
  domainType: DomainType;
  label: string;
  done: number;
  partial: number;
  missed: number;
  total: number;
  score: number;
  state: 'steady' | 'thin' | 'needs_attention';
}

export interface FlywheelSummary {
  title: string;
  entries: FlywheelEntry[];
}

export type ConnectionRecipientId = 'partner' | 'family' | 'friend' | 'community';
export type ConnectionContextId =
  | 'practical_help'
  | 'conversation'
  | 'affection'
  | 'family_presence'
  | 'repair'
  | 'comfort_first'
  | 'consent_led_closeness';

export interface ConnectionRecipientOption {
  id: ConnectionRecipientId;
  label: string;
  focusLabel: string;
}

export interface ConnectionContextOption {
  id: ConnectionContextId;
  label: string;
  description: string;
  recipients?: ConnectionRecipientId[];
}

export const CORE_FLYWHEEL: Array<{ domainType: DomainType; label: string }> = [
  { domainType: 'BODY', label: 'Body' },
  { domainType: 'FUEL', label: 'Fuel' },
  { domainType: 'METIME', label: 'Self' },
  { domainType: 'USTIME', label: 'Connection' },
];

export const CONNECTION_SUPPORT_OPTIONS = [
  'Low-energy day: make warmth easier and ask less of them.',
  'Body-care day: comfort, tea, heat, chores, no pressure.',
  'No-mood day: affection stays available without an agenda.',
  'Pain day: reduce load first, then offer closeness if it helps.',
];

const BODY_HEALTH_PATTERN =
  /\b(pain|bleeding|severe fatigue|fatigue|medical|symptom|symptoms|injury|unwell|dizzy|chest|breathless|inactive|not exercised|health concern)\b/i;
const FUEL_HEALTH_PATTERN =
  /\b(alcohol|drinking|trigger food|trigger foods|allergy|intolerance|sick|vomit|diarrhoea|bloating|bleeding|severe fatigue|symptom|symptoms|medical|health concern)\b/i;

export function buildHealthGuardrailRecommendation(
  domainType: DomainType,
  focusDescription?: string | null,
): string | null {
  const focus = focusDescription?.trim();
  if (!focus) return null;

  if (domainType === 'BODY' && BODY_HEALTH_PATTERN.test(focus)) {
    return 'Choose a lower-intensity version such as easy walking, mobility, or rest. Kairos does not diagnose symptoms; speak to a GP or clinician if pain, bleeding, severe fatigue, or medical concerns continue.';
  }

  if (domainType === 'FUEL' && FUEL_HEALTH_PATTERN.test(focus)) {
    return 'Reflect on the pattern without diagnosing it. If alcohol, trigger foods, bleeding, severe fatigue, or symptoms worry you or keep repeating, speak to a GP, clinician, or appropriate support service.';
  }

  return null;
}

export function buildHealthPatternReflection(
  domainType: DomainType,
  notes: Array<string | null | undefined>,
): string | null {
  if (domainType !== 'BODY' && domainType !== 'FUEL') return null;
  const pattern = domainType === 'BODY' ? BODY_HEALTH_PATTERN : FUEL_HEALTH_PATTERN;
  const repeatedNotes = notes.filter((note) => pattern.test(note ?? ''));
  if (repeatedNotes.length < 2) return null;

  if (domainType === 'BODY') {
    return 'A Body pattern is repeating. Keep tracking if it helps, choose the lower-intensity version today, and take ongoing pain, bleeding, severe fatigue, or medical concerns to a GP or clinician.';
  }

  return 'A Fuel pattern is repeating. Keep the label discreet, reflect on what happened, and take ongoing alcohol concerns, trigger foods, or worrying symptoms to a GP, clinician, or appropriate support service.';
}

export const CONNECTION_RECIPIENT_OPTIONS: ConnectionRecipientOption[] = [
  { id: 'partner', label: 'Partner', focusLabel: 'Partner' },
  { id: 'family', label: 'Family', focusLabel: 'Family' },
  { id: 'friend', label: 'Friend', focusLabel: 'Friend' },
  { id: 'community', label: 'Wider community', focusLabel: 'Community' },
];

export const CONNECTION_CONTEXT_OPTIONS: ConnectionContextOption[] = [
  {
    id: 'practical_help',
    label: 'Practical help',
    description: 'Do one useful thing that lowers load.',
  },
  {
    id: 'conversation',
    label: 'Conversation',
    description: 'Ask a better question and listen.',
  },
  {
    id: 'affection',
    label: 'Affection',
    description: 'Offer warmth with no agenda.',
    recipients: ['partner', 'family'],
  },
  {
    id: 'family_presence',
    label: 'Family presence',
    description: 'Be present in one small ordinary moment.',
    recipients: ['family'],
  },
  {
    id: 'repair',
    label: 'Repair',
    description: 'Own one small friction point and make it easier.',
  },
  {
    id: 'comfort_first',
    label: 'Comfort first',
    description: 'Pain, tiredness, cycle symptoms, low mood, or not in the mood.',
    recipients: ['partner'],
  },
  {
    id: 'consent_led_closeness',
    label: 'Consent-led closeness',
    description: 'Only when context and consent make it right.',
    recipients: ['partner'],
  },
];

const CONNECTION_COMFORT_PATTERN =
  /\b(pain|tired|tiredness|cycle|symptom|symptoms|low mood|not in the mood|not-in-the-mood|no mood|no-mood|unwell|sore)\b/i;

export function getConnectionContextOptions(
  recipientId: ConnectionRecipientId,
): ConnectionContextOption[] {
  return CONNECTION_CONTEXT_OPTIONS.filter(
    (option) => !option.recipients || option.recipients.includes(recipientId),
  );
}

export function buildConnectionFocusDescription(
  recipientId: ConnectionRecipientId,
  contextId: ConnectionContextId,
): string {
  const recipient =
    CONNECTION_RECIPIENT_OPTIONS.find((option) => option.id === recipientId) ??
    CONNECTION_RECIPIENT_OPTIONS[0];
  const context =
    CONNECTION_CONTEXT_OPTIONS.find((option) => option.id === contextId) ??
    CONNECTION_CONTEXT_OPTIONS[0];

  return `${recipient.focusLabel}: ${context.label}. ${context.description}`;
}

export function buildConnectionRecommendation(focusDescription?: string | null): string | null {
  const focus = focusDescription?.trim();
  if (!focus) return null;

  const lowerFocus = focus.toLowerCase();
  if (lowerFocus.includes('partner') && CONNECTION_COMFORT_PATTERN.test(lowerFocus)) {
    return 'Prioritise comfort, practical help, and consent-led presence. Ask less, make care easier.';
  }

  if (lowerFocus.includes('family')) {
    return 'Offer one small presence action: help, listen, play, or make the room easier.';
  }

  if (lowerFocus.includes('friend')) {
    return 'Send one low-pressure check-in or make one useful plan they can easily accept.';
  }

  if (lowerFocus.includes('community')) {
    return 'Make one wider-community action useful, bounded, and easy to receive.';
  }

  return null;
}

export function getDailyDomainLabel(domain: DomainConfig): string {
  return domain.label;
}

export function getEarlyWakeProtocol(now = new Date()): EarlyWakeProtocol | null {
  const hour = now.getHours();
  if (hour < 4 || hour >= 7) return null;

  return {
    title: 'Early-wake protocol',
    body: 'Do the floor, then decide whether the day starts now or you recover more sleep.',
    steps: [
      'Water first.',
      'No scrolling for the first ten minutes.',
      'Pick one tiny body or fuel action.',
      'If you are still tired, return to bed without guilt.',
    ],
  };
}

function statusPriority(status?: CheckInStatus): number {
  if (status === 'Missed') return 0;
  if (status === 'Pending' || !status) return 1;
  if (status === 'Partial') return 2;
  return 3;
}

export function buildCatchUpPath(
  domains: DomainConfig[],
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>,
): CatchUpPath | null {
  const target = [...domains].sort(
    (a, b) =>
      statusPriority(todayCheckIns[a.type]?.status) - statusPriority(todayCheckIns[b.type]?.status),
  )[0];
  const status = target ? todayCheckIns[target.type]?.status : undefined;
  // Only prompt when the domain is still unmarked. A deliberate Missed mark means the user
  // has already acknowledged the domain; showing a catch-up card at that point is nagging.
  if (!target || (status !== 'Pending' && status !== undefined)) return null;

  return {
    title: 'Choose one check-in',
    body: 'Start with the easiest open item. One clear mark is enough for now.',
    domainType: target.type,
    domainLabel: target.label,
    steps: [
      target.prepOptions[0],
      `Do the smallest useful version of ${target.focusOptions[0].toLowerCase()}.`,
      'Use Partial when a smaller useful version happened.',
    ],
  };
}

export function buildAccountabilityPrompt(ignoredCount: number): AccountabilityPrompt {
  if (ignoredCount >= 2) {
    return {
      level: 3,
      title: 'End-of-day check',
      body: 'Pick one open item and record what happened. A smaller useful version still counts.',
      steps: [
        'Choose one open item.',
        'Mark Done, Partial, or Missed.',
        'Leave the rest for tomorrow if needed.',
      ],
    };
  }

  if (ignoredCount === 1) {
    return {
      level: 2,
      title: 'Quick reset',
      body: 'One small mark keeps the day live. Choose the easiest open item.',
      steps: ['Choose one open item.', 'Do two minutes.', 'Record what happened.'],
    };
  }

  return {
    level: 1,
    title: 'Still open',
    body: 'One item still needs a check-in. Mark it when you are ready.',
    steps: ['Pick the easiest item.', 'Make the first mark.', 'Keep moving.'],
  };
}

function last7Dates(today = new Date()): string[] {
  const dates: string[] = [];
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    dates.push(toLocalIsoDate(d));
  }
  return dates;
}

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function scoreStatus(status?: CheckInStatus): number {
  if (status === 'Done') return 1;
  if (status === 'Partial' || status === 'Protected') return 0.5;
  return 0;
}

export function buildWeeklyFlywheel({
  email,
  checkInHistory,
  todayCheckIns,
  today = new Date(),
}: {
  email?: string | null;
  checkInHistory: Record<string, Partial<Record<DomainType, CheckInStatus>>>;
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  today?: Date;
}): FlywheelSummary {
  const availableDomains = getAvailableDomains(email);
  const domainMap = new Map(availableDomains.map((domain) => [domain.type, domain]));
  const rows = CORE_FLYWHEEL.filter((item) => domainMap.has(item.domainType));
  const dates = last7Dates(today);
  const todayIso = toLocalIsoDate(today);

  return {
    title: 'Core flywheel',
    entries: rows.map((row) => {
      let done = 0;
      let partial = 0;
      let missed = 0;
      let score = 0;

      for (const date of dates) {
        const status =
          date === todayIso
            ? (todayCheckIns[row.domainType]?.status ?? checkInHistory[date]?.[row.domainType])
            : checkInHistory[date]?.[row.domainType];
        if (status === 'Done') done += 1;
        if (status === 'Partial' || status === 'Protected') partial += 1;
        if (status === 'Missed') missed += 1;
        score += scoreStatus(status);
      }

      const pct = Math.round((score / dates.length) * 100);
      const state = pct >= 70 ? 'steady' : pct >= 40 ? 'thin' : 'needs_attention';

      return {
        domainType: row.domainType,
        label: row.label,
        done,
        partial,
        missed,
        total: dates.length,
        score: pct,
        state,
      };
    }),
  };
}
