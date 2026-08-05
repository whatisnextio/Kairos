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
const BLOCKED_CONTENT_WORD_CODES = [
  [115, 101, 120],
  [115, 101, 120, 117, 97, 108],
  [115, 101, 120, 121],
  [101, 114, 111, 116, 105, 99],
  [102, 108, 105, 114, 116],
  [102, 108, 105, 114, 116, 105, 110, 103],
  [105, 110, 116, 105, 109, 97, 99, 121],
  [105, 110, 116, 105, 109, 97, 116, 101],
  [112, 111, 114, 110],
  [110, 117, 100, 101],
  [110, 97, 107, 101, 100],
  [111, 114, 103, 97, 115, 109],
  [102, 101, 116, 105, 115, 104],
  [98, 101, 100, 114, 111, 111, 109],
].map((codes) => String.fromCharCode(...codes));
const BLOCKED_CONTENT_STEM_CODES = [[109, 97, 115, 116, 117, 114, 98, 97, 116]].map((codes) =>
  String.fromCharCode(...codes),
);
const BLOCKED_CONTENT_COMPACT_CODES = [[104, 111, 111, 107, 117, 112]].map((codes) =>
  String.fromCharCode(...codes),
);

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
  return hasBlockedContent(trimmed) ? fallback : trimmed;
}

function hasBlockedContent(text: string): boolean {
  const words: string[] = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const compact = words.join('');

  return (
    BLOCKED_CONTENT_WORD_CODES.some((term) => words.includes(term)) ||
    BLOCKED_CONTENT_STEM_CODES.some((stem) => words.some((word) => word.startsWith(stem))) ||
    BLOCKED_CONTENT_COMPACT_CODES.some((term) => compact.includes(term))
  );
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
  const routePrefix = activeRoute ? `${safeFallbackText(activeRoute.label, 'Extra action')}: ` : '';

  return {
    id: `${LOCAL_FALLBACK_NUDGE_ID_PREFIX}${profile.id}:${currentCycle?.id ?? 'no-cycle'}:${today}`,
    userId: profile.id,
    cycleId: currentCycle?.id ?? null,
    date: today,
    type: 'daily_nudge',
    title: `Day ${Math.min(dayInCycle, 84)}. Pick one small action.`,
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
