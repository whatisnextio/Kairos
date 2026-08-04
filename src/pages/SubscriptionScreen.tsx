import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useAppStore } from '@/store/useAppStore';
import { buildStripeCheckoutUrl } from '@/utils/billing';
import { SUBSCRIPTION_COPY } from '@/utils/brandCopy';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STRIPE_CHECKOUT_URL = import.meta.env.VITE_STRIPE_CHECKOUT_URL as string;

export default function SubscriptionScreen() {
  const navigate = useNavigate();
  const { profile } = useAppStore();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const hasPaidAccess = hasBrotherhoodAccess(profile?.tier);

  const handleUpgrade = () => {
    setCheckoutError(null);
    const url = buildStripeCheckoutUrl({
      checkoutUrl: STRIPE_CHECKOUT_URL,
      profileId: profile?.id,
    });

    if (!url) {
      setCheckoutError('Checkout is not available yet. Try again later or contact support.');
      return;
    }

    // Set flag so the app polls for tier upgrade when Stripe redirects back.
    localStorage.setItem('kairos_checkout_pending', String(Date.now()));
    window.location.href = url;
  };

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="flex items-center gap-1.5 text-base-subtext hover:text-base-text text-sm -mb-1 transition-colors"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back
      </button>
      <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">
        {SUBSCRIPTION_COPY.title}
      </h1>
      <p className="text-base-subtext text-sm">{SUBSCRIPTION_COPY.intro}</p>

      <Card className="border-accent-green/40">
        <p className="font-heading text-3xl font-bold text-base-text">{SUBSCRIPTION_COPY.price}</p>
        <p className="text-base-subtext text-sm">{SUBSCRIPTION_COPY.priceSuffix}</p>

        <ul className="mt-4 flex flex-col gap-2">
          {SUBSCRIPTION_COPY.paidFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-base-text">
              <span className="text-accent-green font-bold">+</span>
              {feature}
            </li>
          ))}
        </ul>

        <Button onClick={handleUpgrade} className="w-full mt-6" disabled={hasPaidAccess}>
          {hasPaidAccess ? 'Already active' : 'Unlock Brotherhood'}
        </Button>
        {checkoutError && (
          <p role="alert" className="text-status-missed text-xs mt-3">
            {checkoutError}
          </p>
        )}
      </Card>

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Free tier
        </p>
        <ul className="flex flex-col gap-2">
          {SUBSCRIPTION_COPY.freeFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-base-subtext">
              <span className="text-base-muted">-</span>
              {feature}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Lifechanger
        </p>
        <p className="text-base-subtext text-sm">{SUBSCRIPTION_COPY.lifechanger}</p>
      </Card>

      <p className="text-base-muted text-xs text-center">
        Payment and cancellation details are handled by Stripe when checkout is available.
      </p>
    </div>
  );
}
