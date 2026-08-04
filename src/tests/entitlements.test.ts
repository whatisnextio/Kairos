import type { Profile } from '@/types';
import { SUBSCRIPTION_TIER_CONFIGS } from '@/types';
import {
  applyComplimentaryBrotherhood,
  getComplimentaryProfileFields,
  getSubscriptionTierLabel,
  hasBrotherhoodAccess,
  hasComplimentaryBrotherhood,
  hasPaidAccess,
} from '@/utils/entitlements';
import { describe, expect, it } from 'vitest';

const baseProfile: Profile = {
  id: 'user-1',
  displayName: 'Liam',
  identityAnchorId: 'provider',
  tier: 'free',
  xp: 0,
  currentKairosCycleId: null,
  dateOfBirth: '1984-01-01',
  squadId: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: null,
  cancelAtPeriodEnd: true,
  currentPeriodEnd: '2026-12-31T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('complimentary paid entitlement', () => {
  it('matches the owner email case-insensitively', () => {
    expect(hasComplimentaryBrotherhood('LDGMCDOWELL@gmail.com')).toBe(true);
    expect(hasComplimentaryBrotherhood(' ldgmcdowell@gmail.com ')).toBe(true);
  });

  it('does not match other emails', () => {
    expect(hasComplimentaryBrotherhood('someone@example.com')).toBe(false);
    expect(hasComplimentaryBrotherhood(null)).toBe(false);
  });

  it('returns database fields for the owner entitlement', () => {
    expect(getComplimentaryProfileFields('ldgmcdowell@gmail.com')).toEqual({
      tier: 'lifechanger',
      subscription_status: 'active',
      cancel_at_period_end: false,
      current_period_end: null,
    });
  });

  it('upgrades the profile shape used by the app', () => {
    expect(applyComplimentaryBrotherhood('ldgmcdowell@gmail.com', baseProfile)).toMatchObject({
      tier: 'lifechanger',
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });
  });
});

describe('subscription tier contract', () => {
  it('keeps database tier keys stable while exposing general-audience labels', () => {
    expect(Object.keys(SUBSCRIPTION_TIER_CONFIGS)).toEqual(['free', 'brotherhood', 'lifechanger']);
  });

  it('treats Kairos Plus and Lifechanger as paid V1 access', () => {
    expect(hasPaidAccess('free')).toBe(false);
    expect(hasPaidAccess('brotherhood')).toBe(true);
    expect(hasPaidAccess('lifechanger')).toBe(true);
    expect(hasBrotherhoodAccess('brotherhood')).toBe(true);
    expect(hasBrotherhoodAccess('lifechanger')).toBe(true);
  });

  it('exposes stable tier labels for account UI', () => {
    expect(getSubscriptionTierLabel('free')).toBe('Free');
    expect(getSubscriptionTierLabel('brotherhood')).toBe('Kairos Plus');
    expect(getSubscriptionTierLabel('lifechanger')).toBe('Lifechanger');
  });
});
