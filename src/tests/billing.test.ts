import { buildStripeCheckoutUrl } from '@/utils/billing';
import { describe, expect, it } from 'vitest';

describe('buildStripeCheckoutUrl', () => {
  it('adds the profile id as the Stripe client reference', () => {
    expect(
      buildStripeCheckoutUrl({
        checkoutUrl: 'https://buy.stripe.com/test_123?prefilled_email=a%40b.com',
        profileId: 'profile-1',
      }),
    ).toBe(
      'https://buy.stripe.com/test_123?prefilled_email=a%40b.com&client_reference_id=profile-1',
    );
  });

  it('returns null when checkout is not configured', () => {
    expect(buildStripeCheckoutUrl({ checkoutUrl: '', profileId: 'profile-1' })).toBeNull();
    expect(buildStripeCheckoutUrl({ checkoutUrl: 'not a url', profileId: 'profile-1' })).toBeNull();
    expect(buildStripeCheckoutUrl({ checkoutUrl: 'https://buy.stripe.com/test_123' })).toBeNull();
  });
});
