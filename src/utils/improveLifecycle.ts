import {
  type CustomRoute,
  type DomainType,
  type NudgeStatus,
  PRIVATE_ROUTE_TEMPLATES,
  PUBLIC_DOMAIN_TYPES,
} from '@/types';

export type ImproveCompletionTarget =
  | { kind: 'core'; domainType: DomainType }
  | { kind: 'custom'; routeId: string }
  | { kind: 'none' };

export function getImproveStatusHelper(status: NudgeStatus): string {
  if (status === 'new') return 'Accept keeps this card in Active until you close it.';
  if (status === 'accepted') return 'Active cards stay here until you mark complete or dismiss.';
  if (status === 'completed') return 'Closed today. Any reward is awarded once.';
  return 'Dismissed cards stay hidden today and can return as new options tomorrow.';
}

export function getDismissedCardsMessage(count: number): string {
  const label = count === 1 ? 'card is' : 'cards are';
  return `${count} dismissed ${label} hidden for today. Reminders may still ask for a check-in if notifications are enabled.`;
}

export function normaliseNudgeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('no session')) {
    return 'Sign in again for an AI card. Your Kairos options are ready below.';
  }

  if (lower.includes('free tier') || lower.includes('tier')) {
    return 'Daily AI cards are included in Kairos Plus. Free accounts get the Sunday nudge.';
  }

  if (lower.includes('failed to store')) {
    return 'AI made a card but could not save it. Retry, or choose a Kairos option below.';
  }

  if (lower.includes('failed') || lower.includes('unavailable')) {
    return 'AI did not complete this time. Retry, or choose a Kairos option below.';
  }

  return 'AI is not ready right now. Your Kairos options are ready below.';
}

export function resolveImproveCompletionTarget({
  domainType,
  customRouteId,
  customRoutes,
}: {
  domainType?: DomainType;
  customRouteId?: string;
  customRoutes: CustomRoute[];
}): ImproveCompletionTarget {
  if (customRouteId) return { kind: 'custom', routeId: customRouteId };
  if (!domainType) return { kind: 'none' };
  if (PUBLIC_DOMAIN_TYPES.includes(domainType)) return { kind: 'core', domainType };

  const privateTemplate = PRIVATE_ROUTE_TEMPLATES.find((template) => template.type === domainType);
  if (!privateTemplate) return { kind: 'none' };

  const matchedRoute = customRoutes.find(
    (route) =>
      !route.archivedAt && route.label.trim().toLowerCase() === privateTemplate.label.toLowerCase(),
  );

  return matchedRoute ? { kind: 'custom', routeId: matchedRoute.id } : { kind: 'none' };
}
