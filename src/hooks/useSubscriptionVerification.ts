import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useState } from 'react';

const PENDING_KEY = 'kairos_checkout_pending';
const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;
const MAX_AGE_MS = 5 * 60 * 1000; // discard flags older than 5 min

export function useSubscriptionVerification() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isBootstrapLoading = useAppStore((s) => s.isBootstrapLoading);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isBootstrapLoading) return;

    const flagValue = localStorage.getItem(PENDING_KEY);
    if (!flagValue) return;

    const flagAge = Date.now() - Number(flagValue);
    if (Number.isNaN(flagAge) || flagAge > MAX_AGE_MS) {
      localStorage.removeItem(PENDING_KEY);
      return;
    }

    if (profile?.tier === 'brotherhood') {
      localStorage.removeItem(PENDING_KEY);
      return;
    }

    if (!profile?.id) return;

    let cancelled = false;
    let attempts = 0;
    setIsVerifying(true);

    const poll = async () => {
      while (attempts < MAX_ATTEMPTS && !cancelled) {
        attempts++;
        try {
          const { data } = await supabase
            .from('profiles')
            .select(
              'tier, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end, current_period_end',
            )
            .eq('id', profile.id)
            .single();

          if (data?.tier === 'brotherhood') {
            if (!cancelled) {
              const current = useAppStore.getState().profile;
              if (current) {
                setProfile({
                  ...current,
                  tier: 'brotherhood',
                  stripeCustomerId:
                    (data.stripe_customer_id as string | null) ?? current.stripeCustomerId,
                  stripeSubscriptionId:
                    (data.stripe_subscription_id as string | null) ?? current.stripeSubscriptionId,
                  subscriptionStatus:
                    (data.subscription_status as string | null) ?? current.subscriptionStatus,
                  cancelAtPeriodEnd: (data.cancel_at_period_end as boolean | null) ?? false,
                  currentPeriodEnd: (data.current_period_end as string | null) ?? null,
                });
              }
              localStorage.removeItem(PENDING_KEY);
              setIsVerifying(false);
            }
            return;
          }
        } catch {
          // network error, keep polling
        }

        if (attempts < MAX_ATTEMPTS && !cancelled) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }

      if (!cancelled) {
        localStorage.removeItem(PENDING_KEY);
        setIsVerifying(false);
        setTimedOut(true);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [isBootstrapLoading, profile?.id, profile?.tier, setProfile]);

  return { isVerifying, timedOut };
}
