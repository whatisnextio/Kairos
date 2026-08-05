import type { Profile, SubscriptionTier } from '@/types';

const COMPLIMENTARY_BROTHERHOOD_EMAILS = new Set(['ldgmcdowell@gmail.com']);
const COMPLIMENTARY_LIFECHANGER_EMAILS = new Set(['ldgmcdowell@gmail.com']);
const APP_ACCESS_TIERS = new Set<SubscriptionTier>(['free', 'brotherhood', 'lifechanger']);

export function hasBrotherhoodAccess(tier: SubscriptionTier | null | undefined): boolean {
  return tier ? APP_ACCESS_TIERS.has(tier) : false;
}

export function hasComplimentaryBrotherhood(email: string | null | undefined): boolean {
  const normalisedEmail = email?.trim().toLowerCase() ?? '';
  return (
    COMPLIMENTARY_BROTHERHOOD_EMAILS.has(normalisedEmail) ||
    COMPLIMENTARY_LIFECHANGER_EMAILS.has(normalisedEmail)
  );
}

export function getComplimentaryProfileFields(email: string | null | undefined) {
  if (!hasComplimentaryBrotherhood(email)) return {};

  return {
    tier: COMPLIMENTARY_LIFECHANGER_EMAILS.has(email?.trim().toLowerCase() ?? '')
      ? 'lifechanger'
      : 'brotherhood',
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
    tier: COMPLIMENTARY_LIFECHANGER_EMAILS.has(email?.trim().toLowerCase() ?? '')
      ? 'lifechanger'
      : 'brotherhood',
    subscriptionStatus: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}
