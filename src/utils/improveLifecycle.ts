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
  if (status === 'new') return 'Tap Accept to keep this for today.';
  if (status === 'accepted') return 'Complete it when done, or dismiss if it is not useful.';
  if (status === 'completed') return 'Done today. Points are added once.';
  return 'Hidden suggestions stay out of the way today unless you restore them.';
}

export function getDismissedCardsMessage(count: number): string {
  const label = count === 1 ? 'suggestion is' : 'suggestions are';
  return `${count} hidden ${label} out of the way for today. Show hidden suggestions to restore one. Reminders may still ask for a check-in if notifications are enabled.`;
}

export function normaliseNudgeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('no session')) {
    return 'Sign in again for an extra suggestion. Your options are ready below.';
  }

  if (lower.includes('tier')) {
    return 'Extra suggestions are included in the app. Try again, or choose an option below.';
  }

  if (lower.includes('failed to store')) {
    return 'The suggestion could not be saved. Try again, or choose an option below.';
  }

  if (lower.includes('failed') || lower.includes('unavailable')) {
    return 'The suggestion is not ready. Try again, or choose an option below.';
  }

  return 'The suggestion is not ready right now. Your options are ready below.';
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
