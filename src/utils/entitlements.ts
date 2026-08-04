import { type Profile, SUBSCRIPTION_TIER_CONFIGS, type SubscriptionTier } from '@/types';

const COMPLIMENTARY_BROTHERHOOD_EMAILS = new Set(['ldgmcdowell@gmail.com']);
const PAID_TIERS = new Set<SubscriptionTier>(['brotherhood', 'lifechanger']);

export function hasPaidAccess(tier: SubscriptionTier | null | undefined): boolean {
  return tier ? SUBSCRIPTION_TIER_CONFIGS[tier].accessLevel === 'paid' : false;
}

export function hasBrotherhoodAccess(tier: SubscriptionTier | null | undefined): boolean {
  return tier ? PAID_TIERS.has(tier) : false;
}

export function getSubscriptionTierLabel(tier: SubscriptionTier | null | undefined): string {
  return tier ? SUBSCRIPTION_TIER_CONFIGS[tier].label : 'Free';
}

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
