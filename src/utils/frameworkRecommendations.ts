import type { CheckInStatus, DailyCheckIn, DomainType, UserDomainFocus } from '@/types';
import { getAvailableDomains } from '@/types';

export type FrameworkLens = 'Prep' | 'Reflect' | 'Coach' | 'Feedback';

export interface FrameworkRecommendation {
  id: string;
  lens: FrameworkLens;
  title: string;
  body: string;
  domainType: DomainType;
  domainLabel: string;
  actionText: string;
}

interface BuildArgs {
  email?: string | null;
  domainFocuses: UserDomainFocus[];
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
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
}: BuildArgs): FrameworkRecommendation[] {
  const availableDomains = getAvailableDomains(email);
  const rankedDomains = [...availableDomains].sort(
    (a, b) => statusRank(todayCheckIns[a.type]?.status) - statusRank(todayCheckIns[b.type]?.status),
  );
  const primaryDomain = rankedDomains[0] ?? availableDomains[0];
  const secondaryDomain = rankedDomains[1] ?? primaryDomain;
  const focus = domainFocuses.find((item) => item.domainType === primaryDomain.type);
  const secondaryFocus = domainFocuses.find((item) => item.domainType === secondaryDomain.type);
  const primaryAction = focus?.focusDescription ?? primaryDomain.focusOptions[0];
  const secondaryAction = secondaryFocus?.focusDescription ?? secondaryDomain.focusOptions[0];

  return [
    {
      id: `${primaryDomain.type}-prep`,
      lens: 'Prep',
      title: `Prep ${primaryDomain.label}`,
      body: primaryDomain.prepOptions[0],
      domainType: primaryDomain.type,
      domainLabel: primaryDomain.label,
      actionText: primaryAction,
    },
    {
      id: `${secondaryDomain.type}-coach`,
      lens: 'Coach',
      title: `Choose ${secondaryDomain.label}`,
      body: secondaryDomain.coachPrompt,
      domainType: secondaryDomain.type,
      domainLabel: secondaryDomain.label,
      actionText: secondaryAction,
    },
    {
      id: `${primaryDomain.type}-reflect`,
      lens: 'Reflect',
      title: 'Quick reflection',
      body: primaryDomain.reflectPrompt,
      domainType: primaryDomain.type,
      domainLabel: primaryDomain.label,
      actionText: 'Write one honest line',
    },
    {
      id: `${secondaryDomain.type}-feedback`,
      lens: 'Feedback',
      title: `${secondaryDomain.label} signal`,
      body: secondaryDomain.feedbackPrompt,
      domainType: secondaryDomain.type,
      domainLabel: secondaryDomain.label,
      actionText: secondaryAction,
    },
  ];
}
