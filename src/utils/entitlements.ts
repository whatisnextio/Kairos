import type { Profile } from '@/types';

const COMPLIMENTARY_BROTHERHOOD_EMAILS = new Set(['ldgmcdowell@gmail.com']);

export function hasComplimentaryBrotherhood(email: string | null | undefined): boolean {
  return COMPLIMENTARY_BROTHERHOOD_EMAILS.has(email?.trim().toLowerCase() ?? '');
}

export function getComplimentaryProfileFields(email: string | null | undefined) {
  if (!hasComplimentaryBrotherhood(email)) return {};

  return {
    tier: 'brotherhood',
    subscription_status: 'active',
    cancel_at_period_end: false,
    current_period_end: null,
  } as const;
}

export function applyComplimentaryBrotherhood(
  email: string | null | undefined,
  profile: Profile,
): Profile {
  if (!hasComplimentaryBrotherhood(email)) return profile;

  return {
    ...profile,
    tier: 'brotherhood',
    subscriptionStatus: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}
