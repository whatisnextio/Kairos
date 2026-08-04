import type {
  CheckInStatus,
  CustomRoute,
  CustomRouteCheckIn,
  DailyCheckIn,
  DomainConfig,
  DomainType,
  UserDomainFocus,
} from '@/types';
import { getAvailableDomains, getDomainConfig } from '@/types';
import { getDiscreetDomainLabel } from '@/utils/v1Framework';

export type FrameworkLens = 'Prep' | 'Reflect' | 'Coach' | 'Feedback';

export interface FrameworkRecommendation {
  id: string;
  lens: FrameworkLens;
  title: string;
  body: string;
  domainType: DomainType;
  customRouteId?: string;
  domainLabel: string;
  actionText: string;
}

interface BuildArgs {
  email?: string | null;
  domainFocuses: UserDomainFocus[];
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  customRoutes?: CustomRoute[];
  todayCustomRouteCheckIns?: Record<string, CustomRouteCheckIn>;
}

function statusRank(status?: CheckInStatus): number {
  if (status === 'Missed') return 0;
  if (status === 'Pending' || !status) return 1;
  if (status === 'Partial') return 2;
  return 3;
}

export function buildFrameworkRecommendations({
  email,
  domainFocuses,
  todayCheckIns,
  customRoutes = [],
  todayCustomRouteCheckIns = {},
}: BuildArgs): FrameworkRecommendation[] {
  const availableDomains = getAvailableDomains(email);
  const domainTargets = availableDomains.map((domain) => {
    const focus = domainFocuses.find((item) => item.domainType === domain.type);
    return {
      id: domain.type,
      domain,
      label: getDiscreetDomainLabel(domain, email),
      action: focus?.focusDescription ?? domain.focusOptions[0],
      status: todayCheckIns[domain.type]?.status,
      customRouteId: undefined as string | undefined,
    };
  });
  const customTargets = customRoutes
    .filter((route) => !route.archivedAt)
    .map((route) => {
      const parentDomain = getDomainConfig(route.parentDomainType, email) ?? availableDomains[0];
      return {
        id: route.id,
        domain: parentDomain,
        label: route.label,
        action: route.focusDescription,
        status: todayCustomRouteCheckIns[route.id]?.status,
        customRouteId: route.id,
      };
    })
    .filter((target): target is typeof target & { domain: DomainConfig } => Boolean(target.domain));
  const rankedTargets = [...domainTargets, ...customTargets].sort(
    (a, b) => statusRank(a.status) - statusRank(b.status),
  );
  const primary = rankedTargets[0] ?? domainTargets[0];
  const secondary = rankedTargets[1] ?? primary;

  const recommendations: FrameworkRecommendation[] = [
    {
      id: `${primary.id}-prep`,
      lens: 'Prep',
      title: `Prep ${primary.label}`,
      body: primary.domain.prepOptions[0],
      domainType: primary.domain.type,
      customRouteId: primary.customRouteId,
      domainLabel: primary.label,
      actionText: primary.action,
    },
    {
      id: `${secondary.id}-coach`,
      lens: 'Coach',
      title: `Choose ${secondary.label}`,
      body: secondary.domain.coachPrompt,
      domainType: secondary.domain.type,
      customRouteId: secondary.customRouteId,
      domainLabel: secondary.label,
      actionText: secondary.action,
    },
    {
      id: `${primary.id}-reflect`,
      lens: 'Reflect',
      title: 'Quick reflection',
      body: primary.domain.reflectPrompt,
      domainType: primary.domain.type,
      customRouteId: primary.customRouteId,
      domainLabel: primary.label,
      actionText: 'Write one honest line',
    },
    {
      id: `${secondary.id}-feedback`,
      lens: 'Feedback',
      title: `${secondary.label} signal`,
      body: secondary.domain.feedbackPrompt,
      domainType: secondary.domain.type,
      customRouteId: secondary.customRouteId,
      domainLabel: secondary.label,
      actionText: secondary.action,
    },
  ];

  const firstCustomTarget = customTargets[0];
  const alreadyIncludesCustom = recommendations.some((item) => item.customRouteId);
  if (firstCustomTarget && !alreadyIncludesCustom) {
    recommendations[recommendations.length - 1] = {
      id: `${firstCustomTarget.id}-feedback`,
      lens: 'Feedback',
      title: `${firstCustomTarget.label} signal`,
      body: firstCustomTarget.domain.feedbackPrompt,
      domainType: firstCustomTarget.domain.type,
      customRouteId: firstCustomTarget.customRouteId,
      domainLabel: firstCustomTarget.label,
      actionText: firstCustomTarget.action,
    };
  }

  return recommendations;
}
