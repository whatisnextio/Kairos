import type {
  CheckInStatus,
  CustomRoute,
  CustomRouteCheckIn,
  DailyCheckIn,
  DomainConfig,
  DomainType,
  KairosPhaseConfig,
} from '@/types';
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

export type DayStateProtocolType = 'early_wake' | 'normal_start' | 'catch_up' | 'shutdown';
export type DayStateProtocolActionKind =
  | 'start_rescue'
  | 'open_check_in'
  | 'mark_partial'
  | 'set_tomorrow'
  | 'dismiss';

export type DayStateProtocolTarget =
  | {
      kind: 'domain';
      domainType: DomainType;
      label: string;
      status?: CheckInStatus;
    }
  | {
      kind: 'custom_route';
      routeId: string;
      parentDomainType: DomainType;
      label: string;
      status?: CheckInStatus;
    };

export interface DayStateProtocolAction {
  id: string;
  label: string;
  kind: DayStateProtocolActionKind;
}

export interface DayStateProtocol {
  id: string;
  type: DayStateProtocolType;
  title: string;
  body: string;
  steps: string[];
  target?: DayStateProtocolTarget;
  actions: DayStateProtocolAction[];
}

export interface DayStateSelectorInput {
  now?: Date;
  domains: DomainConfig[];
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  customRoutes?: CustomRoute[];
  todayCustomRouteCheckIns?: Record<string, CustomRouteCheckIn>;
  dismissedProtocolId?: string | null;
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

export interface WeeklyReviewRouteEntry {
  id: string;
  label: string;
  parentDomainType: DomainType;
  done: number;
  partial: number;
  missed: number;
  total: number;
  score: number;
  state: FlywheelEntry['state'];
}

export interface WeeklyReviewEntry extends FlywheelEntry {
  routes: WeeklyReviewRouteEntry[];
}

export interface WeeklyReviewRecommendation {
  state: 'recover' | 'protect' | 'increase';
  targetDomainType: DomainType;
  targetLabel: string;
  reason: string;
  editableText: string;
}

export interface WeeklyReviewSummary {
  title: string;
  weekNumber: number;
  phaseLabel: string;
  score: number;
  proofCount: number;
  slipCount: number;
  partialCount: number;
  entries: WeeklyReviewEntry[];
  recommendation: WeeklyReviewRecommendation;
}

export interface DomainSetupOptionModel {
  focusOptions: string[];
  prepOptions: string[];
  recoveryOptions: string[];
  customPlaceholder: string;
}

export type ConnectionRecipientId = 'partner' | 'family' | 'friend' | 'community';
export type ConnectionContextId =
  | 'practical_help'
  | 'conversation'
  | 'warmth'
  | 'family_presence'
  | 'repair'
  | 'comfort_first';

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
  'Low-energy day: make support easier and ask less of them.',
  'Body-care day: comfort, tea, heat, chores, no pressure.',
  'Overloaded day: practical help first, conversation second.',
  'Pain day: reduce load first, then offer simple support if it helps.',
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
    id: 'warmth',
    label: 'Warmth',
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
    description: 'Pain, tiredness, stress, low mood, or feeling overloaded.',
    recipients: ['partner'],
  },
];

const CONNECTION_COMFORT_PATTERN =
  /\b(pain|tired|tiredness|stress|stressed|low mood|overloaded|unwell|sore)\b/i;

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
    return 'Prioritise comfort, practical help, and low-pressure presence. Ask less, make care easier.';
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

function uniqueOptions(options: Array<string | null | undefined>): string[] {
  return [...new Set(options.map((option) => option?.trim()).filter(Boolean) as string[])];
}

export function buildDomainSetupOptionModel(
  domain: DomainConfig,
  route?: Pick<CustomRoute, 'label' | 'focusDescription'> | null,
): DomainSetupOptionModel {
  const routeLabel = route?.label?.trim();
  const routeFocus = route?.focusDescription?.trim();
  const routeOption =
    routeFocus || (routeLabel ? `${routeLabel}: ${domain.focusOptions[0]}` : null);

  return {
    focusOptions: uniqueOptions([routeOption, ...domain.focusOptions]),
    prepOptions: uniqueOptions(domain.prepOptions),
    recoveryOptions: uniqueOptions(domain.recoveryOptions),
    customPlaceholder: `Custom ${domain.label.toLowerCase()} action`,
  };
}

export function getEarlyWakeProtocol(now = new Date()): EarlyWakeProtocol | null {
  const hour = now.getHours();
  if (hour < 4 || hour >= 7) return null;

  return {
    title: 'Up early',
    body: 'Do something small or go back to sleep — no pressure either way.',
    steps: [
      'Water first.',
      'No scrolling for the first ten minutes.',
      'Pick one small action if you feel ready.',
      'Still tired? Go back to bed — that counts too.',
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
      'Use "Part done" when you did a smaller version.',
    ],
  };
}

function isClosedStatus(status?: CheckInStatus): boolean {
  return status === 'Done' || status === 'Partial' || status === 'Protected';
}

function buildDayStateTargets({
  domains,
  todayCheckIns,
  customRoutes = [],
  todayCustomRouteCheckIns = {},
}: Pick<
  DayStateSelectorInput,
  'domains' | 'todayCheckIns' | 'customRoutes' | 'todayCustomRouteCheckIns'
>): DayStateProtocolTarget[] {
  const domainTargets = domains
    .map<DayStateProtocolTarget | null>((domain) => {
      const status = todayCheckIns[domain.type]?.status;
      if (isClosedStatus(status)) return null;
      return {
        kind: 'domain',
        domainType: domain.type,
        label: domain.label,
        status,
      };
    })
    .filter((target): target is DayStateProtocolTarget => !!target);

  const routeTargets = customRoutes
    .filter((route) => !route.archivedAt)
    .map<DayStateProtocolTarget | null>((route) => {
      const status = todayCustomRouteCheckIns[route.id]?.status;
      if (isClosedStatus(status)) return null;
      return {
        kind: 'custom_route',
        routeId: route.id,
        parentDomainType: route.parentDomainType,
        label: route.label,
        status,
      };
    })
    .filter((target): target is DayStateProtocolTarget => !!target);

  return [...domainTargets, ...routeTargets].sort(
    (a, b) => statusPriority(a.status) - statusPriority(b.status),
  );
}

function hasAnyStartedCheckIn({
  todayCheckIns,
  todayCustomRouteCheckIns = {},
}: Pick<DayStateSelectorInput, 'todayCheckIns' | 'todayCustomRouteCheckIns'>): boolean {
  return [...Object.values(todayCheckIns), ...Object.values(todayCustomRouteCheckIns)].some(
    (checkIn) => !!checkIn && checkIn.status !== 'Pending',
  );
}

function targetLabel(target: DayStateProtocolTarget | undefined): string {
  return target?.label ?? 'one route';
}

function protocolActions(
  type: DayStateProtocolType,
  target?: DayStateProtocolTarget,
): DayStateProtocolAction[] {
  if (type === 'early_wake') {
    return [
      { id: 'start-floor', label: 'Do something small', kind: 'open_check_in' },
      { id: 'dismiss', label: 'Not now', kind: 'dismiss' },
    ];
  }

  if (type === 'shutdown') {
    return [
      { id: 'set-tomorrow', label: 'Plan for tomorrow', kind: 'set_tomorrow' },
      ...(target
        ? [{ id: 'mark-partial', label: 'Mark part done', kind: 'mark_partial' } as const]
        : []),
      { id: 'dismiss', label: 'Not now', kind: 'dismiss' },
    ];
  }

  if (type === 'catch_up') {
    return [
      { id: 'start-rescue', label: 'Do 10 minutes now', kind: 'start_rescue' },
      ...(target
        ? [{ id: 'mark-partial', label: 'Mark part done', kind: 'mark_partial' } as const]
        : []),
      { id: 'dismiss', label: 'Not now', kind: 'dismiss' },
    ];
  }

  return [
    {
      id: 'open-check-in',
      label: target ? `Open ${target.label}` : 'Review today',
      kind: 'open_check_in',
    },
    { id: 'dismiss', label: 'Not now', kind: 'dismiss' },
  ];
}

export function selectDayStateProtocol({
  now = new Date(),
  domains,
  todayCheckIns,
  customRoutes = [],
  todayCustomRouteCheckIns = {},
  dismissedProtocolId = null,
}: DayStateSelectorInput): DayStateProtocol {
  const hour = now.getHours();
  const targets = buildDayStateTargets({
    domains,
    todayCheckIns,
    customRoutes,
    todayCustomRouteCheckIns,
  });
  const target = targets[0];
  const missedTarget = targets.find((item) => item.status === 'Missed');
  const dayStarted = hasAnyStartedCheckIn({ todayCheckIns, todayCustomRouteCheckIns });
  const earlyWake = getEarlyWakeProtocol(now);

  if (earlyWake && !dayStarted) {
    return {
      id: 'early-wake',
      type: 'early_wake',
      title: earlyWake.title,
      body: earlyWake.body,
      steps: earlyWake.steps,
      target,
      actions: protocolActions('early_wake', target),
    };
  }

  if (hour >= 19 && target) {
    return {
      id: 'shutdown',
      type: 'shutdown',
      title: 'Evening wrap-up',
      body: `${targetLabel(target)} still needs a mark. Wrap it up or plan it for tomorrow.`,
      steps: [
        'Pick one open item.',
        'Mark Done, Part done, or Missed.',
        'Leave the rest for tomorrow.',
      ],
      target,
      actions: protocolActions('shutdown', target),
    };
  }

  if ((missedTarget || dismissedProtocolId || (hour >= 12 && target)) && target) {
    const escalated = !!dismissedProtocolId;
    return {
      id: escalated ? 'catch-up-after-dismiss' : 'catch-up',
      type: 'catch_up',
      title: escalated ? 'Quick win' : 'Still time today',
      body: escalated
        ? `${targetLabel(target)} still needs a mark. Record what happened — a smaller version counts.`
        : `${targetLabel(missedTarget ?? target)} is still open. Pick one small action and mark it.`,
      steps: [
        'Ten quiet minutes is enough.',
        'Do the smallest useful version.',
        'Use "Part done" when you did a smaller version.',
      ],
      target,
      actions: protocolActions('catch_up', target),
    };
  }

  return {
    id: target ? 'normal-start' : 'normal-review',
    type: 'normal_start',
    title: target ? 'Start here' : 'All marked',
    body: target
      ? `${targetLabel(target)} is next. Keep it small.`
      : 'Today is marked. Review what worked or set up tomorrow.',
    steps: target
      ? ['Pick the easiest first mark.', 'Record what happened.', 'Keep the next action visible.']
      : ['Scan what worked.', 'Notice one friction point.', 'Set up tomorrow if needed.'],
    target,
    actions: protocolActions('normal_start', target),
  };
}

export function buildAccountabilityPrompt(ignoredCount: number): AccountabilityPrompt {
  if (ignoredCount >= 2) {
    return {
      level: 3,
      title: 'End-of-day check',
      body: 'Pick one open item and record what happened. A smaller version still counts.',
      steps: [
        'Choose one open item.',
        'Mark Done, Part done, or Missed.',
        'Leave the rest for tomorrow if needed.',
      ],
    };
  }

  if (ignoredCount === 1) {
    return {
      level: 2,
      title: 'Quick reset',
      body: 'One small mark keeps the day going. Choose the easiest open item.',
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
    title: 'This week',
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

function countStatuses(statuses: Array<CheckInStatus | undefined>) {
  let done = 0;
  let partial = 0;
  let missed = 0;
  let score = 0;

  for (const status of statuses) {
    if (status === 'Done') done += 1;
    if (status === 'Partial' || status === 'Protected') partial += 1;
    if (status === 'Missed') missed += 1;
    score += scoreStatus(status);
  }

  const pct = Math.round((score / Math.max(statuses.length, 1)) * 100);
  const state: FlywheelEntry['state'] =
    pct >= 70 ? 'steady' : pct >= 40 ? 'thin' : 'needs_attention';

  return { done, partial, missed, total: statuses.length, score: pct, state };
}

function buildWeeklyReviewRecommendation(
  entries: WeeklyReviewEntry[],
  phase: KairosPhaseConfig,
): WeeklyReviewRecommendation {
  const missedHeavy = [...entries].sort((a, b) => b.missed - a.missed || a.score - b.score)[0];
  if (missedHeavy && (missedHeavy.missed >= 3 || missedHeavy.score < 40)) {
    return {
      state: 'recover',
      targetDomainType: missedHeavy.domainType,
      targetLabel: missedHeavy.label,
      reason: `${missedHeavy.label} had the clearest slip pattern this week.`,
      editableText: `Lower ${missedHeavy.label} action size or change the cue. Next week, make the smallest useful version the default.`,
    };
  }

  const partialHeavy = [...entries].sort((a, b) => b.partial - a.partial || a.score - b.score)[0];
  if (partialHeavy && (partialHeavy.partial >= 3 || partialHeavy.score < 70)) {
    return {
      state: 'protect',
      targetDomainType: partialHeavy.domainType,
      targetLabel: partialHeavy.label,
      reason: `${partialHeavy.label} was live but thin.`,
      editableText: `Protect ${partialHeavy.label} rhythm by making Partial explicit and moving the cue earlier.`,
    };
  }

  const target = entries[0];
  const increasePhase = phase.phase === 'INCREASE' || phase.phase === 'RHYTHM';
  if (target && increasePhase) {
    return {
      state: 'increase',
      targetDomainType: target.domainType,
      targetLabel: target.label,
      reason: `${phase.label} supports one controlled load increase after a strong week.`,
      editableText: `Increase one controlled ${target.label} load this week while keeping the current floor.`,
    };
  }

  return {
    state: 'protect',
    targetDomainType: target?.domainType ?? 'BODY',
    targetLabel: target?.label ?? 'Body',
    reason: `${phase.label} favours protecting the rhythm before adding more.`,
    editableText: 'Protect the rhythm this week; keep the current floor before adding load.',
  };
}

export function buildWeeklyReview({
  email,
  checkInHistory,
  todayCheckIns,
  customRoutes = [],
  customRouteCheckInHistory = {},
  todayCustomRouteCheckIns = {},
  phase,
  dayInCycle,
  today = new Date(),
}: {
  email?: string | null;
  checkInHistory: Record<string, Partial<Record<DomainType, CheckInStatus>>>;
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  customRoutes?: CustomRoute[];
  customRouteCheckInHistory?: Record<string, Record<string, CheckInStatus>>;
  todayCustomRouteCheckIns?: Record<string, CustomRouteCheckIn>;
  phase: KairosPhaseConfig;
  dayInCycle: number;
  today?: Date;
}): WeeklyReviewSummary {
  const dates = last7Dates(today);
  const todayIso = toLocalIsoDate(today);
  const flywheel = buildWeeklyFlywheel({ email, checkInHistory, todayCheckIns, today });
  const activeRoutes = customRoutes.filter((route) => !route.archivedAt);

  const entries: WeeklyReviewEntry[] = flywheel.entries.map((entry) => {
    const routes = activeRoutes
      .filter((route) => route.parentDomainType === entry.domainType)
      .map((route) => {
        const statuses = dates.map((date) =>
          date === todayIso
            ? (todayCustomRouteCheckIns[route.id]?.status ??
              customRouteCheckInHistory[date]?.[route.id])
            : customRouteCheckInHistory[date]?.[route.id],
        );
        return {
          id: route.id,
          label: route.label,
          parentDomainType: route.parentDomainType,
          ...countStatuses(statuses),
        };
      });

    return { ...entry, routes };
  });

  const proofCount = entries.reduce((sum, entry) => sum + entry.done + entry.partial, 0);
  const slipCount = entries.reduce((sum, entry) => sum + entry.missed, 0);
  const partialCount = entries.reduce((sum, entry) => sum + entry.partial, 0);
  const score = Math.round(
    entries.reduce((sum, entry) => sum + entry.score, 0) / Math.max(entries.length, 1),
  );

  return {
    title: 'Weekly review',
    weekNumber: Math.max(1, Math.ceil(dayInCycle / 7)),
    phaseLabel: phase.label,
    score,
    proofCount,
    slipCount,
    partialCount,
    entries,
    recommendation: buildWeeklyReviewRecommendation(entries, phase),
  };
}
