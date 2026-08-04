import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useAppStore } from '@/store/useAppStore';
import type { SubscriptionTier } from '@/types';
import { buildStripeCheckoutUrl } from '@/utils/billing';
import { FEATURE_EXPLANATIONS, SUBSCRIPTION_COPY } from '@/utils/brandCopy';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STRIPE_CHECKOUT_URL = import.meta.env.VITE_STRIPE_CHECKOUT_URL as string;
const STRIPE_LIFECHANGER_CHECKOUT_URL = import.meta.env.VITE_STRIPE_LIFECHANGER_CHECKOUT_URL as
  | string
  | undefined;

type PaidCheckoutTier = Extract<SubscriptionTier, 'brotherhood' | 'lifechanger'>;

export default function SubscriptionScreen() {
  const navigate = useNavigate();
  const { profile } = useAppStore();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const hasPaidAccess = hasBrotherhoodAccess(profile?.tier);

  const handleUpgrade = (tier: PaidCheckoutTier) => {
    setCheckoutError(null);
    const checkoutUrl =
      tier === 'lifechanger' ? STRIPE_LIFECHANGER_CHECKOUT_URL : STRIPE_CHECKOUT_URL;
    const url = buildStripeCheckoutUrl({
      checkoutUrl,
      profileId: profile?.id,
    });

    if (!url) {
      setCheckoutError(`${tierLabel(tier)} checkout is not available yet. Contact support.`);
      return;
    }

    // Set flag so the app polls for tier upgrade when Stripe redirects back.
    localStorage.setItem('kairos_checkout_pending', String(Date.now()));
    window.location.href = url;
  };

  const isLifechanger = profile?.tier === 'lifechanger';
  const isBrotherhood = profile?.tier === 'brotherhood';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
              Kairos Plus
            </p>
            <p className="font-heading text-3xl font-bold text-base-text">
              {SUBSCRIPTION_COPY.price}
            </p>
            <p className="text-base-subtext text-sm">{SUBSCRIPTION_COPY.priceSuffix}</p>
          </div>
          {hasPaidAccess && (
            <span className="rounded border border-accent-green/40 px-2 py-1 text-[11px] text-accent-green font-heading uppercase tracking-wider">
              Active
            </span>
          )}
        </div>
        <div className="mt-4 rounded border border-base-border bg-base-black/20 p-3">
          <p className="font-heading text-xs text-base-subtext tracking-widest uppercase mb-1">
            What unlocks
          </p>
          <p className="text-base-subtext text-xs mb-2">{FEATURE_EXPLANATIONS.personalRoutes}</p>
          <p className="text-base-subtext text-xs">{FEATURE_EXPLANATIONS.squad}</p>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {SUBSCRIPTION_COPY.paidFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-base-text">
              <span className="text-accent-green font-bold">+</span>
              {feature}
            </li>
          ))}
        </ul>

        <Button
          onClick={() => handleUpgrade('brotherhood')}
          className="w-full mt-6"
          disabled={hasPaidAccess}
        >
          {hasPaidAccess ? 'Already active' : 'Unlock Kairos Plus'}
        </Button>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
              Lifechanger
            </p>
            <p className="font-heading text-3xl font-bold text-base-text">
              {SUBSCRIPTION_COPY.lifechangerPrice}
            </p>
            <p className="text-base-subtext text-sm">{SUBSCRIPTION_COPY.priceSuffix}</p>
          </div>
          {isLifechanger && (
            <span className="rounded border border-accent-green/40 px-2 py-1 text-[11px] text-accent-green font-heading uppercase tracking-wider">
              Active
            </span>
          )}
        </div>
        <p className="text-base-subtext text-sm mt-4">{SUBSCRIPTION_COPY.lifechanger}</p>
        <p className="text-base-muted text-xs mt-2">{FEATURE_EXPLANATIONS.lifechanger}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {SUBSCRIPTION_COPY.lifechangerFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-base-text">
              <span className="text-accent-green font-bold">+</span>
              {feature}
            </li>
          ))}
        </ul>
        <Button
          onClick={() => handleUpgrade('lifechanger')}
          className="w-full mt-6"
          disabled={isLifechanger}
        >
          {isLifechanger
            ? 'Lifechanger active'
            : isBrotherhood
              ? 'Upgrade to Lifechanger'
              : 'Choose Lifechanger'}
        </Button>
      </Card>

      {checkoutError && (
        <p role="alert" className="text-status-missed text-xs text-center">
          {checkoutError}
        </p>
      )}

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Free tier
        </p>
        <p className="text-base-subtext text-sm mb-3">
          Free is local-first: it lets you run the core four-domain loop on this device before
          choosing paid sync and accountability.
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

      <p className="text-base-muted text-xs text-center">
        Payment and cancellation details are handled by Stripe when checkout is available.
      </p>
    </div>
  );
}

function tierLabel(tier: PaidCheckoutTier): string {
  return tier === 'lifechanger' ? 'Lifechanger' : 'Kairos Plus';
}
