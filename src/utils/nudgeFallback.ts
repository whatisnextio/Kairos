import type {
  AiNudge,
  CheckInStatus,
  CustomRoute,
  DailyCheckIn,
  DomainType,
  KairosCycle,
  Profile,
  UserDomainFocus,
} from '@/types';
import { PRIVATE_ROUTE_TEMPLATES, getDomainConfig } from '@/types';
import { getCurrentPhaseConfig, getDayInCycle } from '@/utils/kairos';
import { toLocalIsoDate } from '@/utils/v1Framework';

export const LOCAL_FALLBACK_NUDGE_ID_PREFIX = 'local-fallback-nudge:';

const CLOSED_CHECK_IN_STATUSES = new Set<CheckInStatus>(['Done', 'Protected']);
const ADULT_CONTENT_PATTERN =
  /\b(sex|sexual|sexy|erotic|flirt|flirting|intimacy|intimate|porn|nude|naked|orgasm|masturbat(?:e|ion|ing)?|fetish|bedroom|hook\s?up)\b/i;

interface BuildLocalFallbackNudgeInput {
  profile: Profile;
  currentCycle: KairosCycle | null;
  domainFocuses: UserDomainFocus[];
  customRoutes: CustomRoute[];
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  email?: string | null;
  now?: Date;
}

function getLabelForDomain(domainType: DomainType, email?: string | null): string {
  const publicDomain = getDomainConfig(domainType, email);
  if (publicDomain) return publicDomain.label;

  const privateRoute = PRIVATE_ROUTE_TEMPLATES.find((template) => template.type === domainType);
  return privateRoute?.label ?? domainType;
}

function clipText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function safeFallbackText(text: string | null | undefined, fallback: string): string {
  const trimmed = text?.trim();
  if (!trimmed) return fallback;
  return ADULT_CONTENT_PATTERN.test(trimmed) ? fallback : trimmed;
}

function isOpenStatus(status: CheckInStatus | undefined): boolean {
  return !status || !CLOSED_CHECK_IN_STATUSES.has(status);
}

export function buildLocalFallbackNudge({
  profile,
  currentCycle,
  domainFocuses,
  customRoutes,
  todayCheckIns,
  email,
  now = new Date(),
}: BuildLocalFallbackNudgeInput): AiNudge {
  const today = toLocalIsoDate(now);
  const dayInCycle = currentCycle ? getDayInCycle(currentCycle.startDate) : 1;
  const phase = getCurrentPhaseConfig(dayInCycle);
  const activeRoute = customRoutes.find((route) => !route.archivedAt);
  const focusedOpenDomain = domainFocuses.find((focus) =>
    isOpenStatus(todayCheckIns[focus.domainType]?.status),
  );
  const openDomainType = focusedOpenDomain?.domainType ?? activeRoute?.parentDomainType ?? null;
  const domainLabel = openDomainType ? getLabelForDomain(openDomainType, email) : 'Kairos';
  const focusText = safeFallbackText(
    focusedOpenDomain?.focusDescription ?? activeRoute?.focusDescription,
    'Pick one useful action and close it today',
  );
  const routePrefix = activeRoute
    ? `${safeFallbackText(activeRoute.label, 'Personal route')}: `
    : '';

  return {
    id: `${LOCAL_FALLBACK_NUDGE_ID_PREFIX}${profile.id}:${currentCycle?.id ?? 'no-cycle'}:${today}`,
    userId: profile.id,
    cycleId: currentCycle?.id ?? null,
    date: today,
    type: 'daily_nudge',
    title: `Day ${Math.min(dayInCycle, 84)}. Close one loop.`,
    body: clipText(
      `${phase.label}. ${routePrefix}${domainLabel}: ${focusText}. Keep it small enough to do now.`,
      200,
    ),
    domainType: openDomainType,
    kairosPhase: phase.phase,
    xpReward: 5,
    status: 'new',
    cta: openDomainType ? 'check_in_now' : 'reflect',
    generatedAt: now.toISOString(),
  };
}
