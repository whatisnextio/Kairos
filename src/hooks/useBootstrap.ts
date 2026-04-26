import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { Profile, KairosCycle, UserDomainFocus, DomainType } from '@/types';

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    identityAnchorId: row.identity_anchor_id as Profile['identityAnchorId'],
    customAnchorName: row.custom_anchor_name as string | undefined,
    tier: row.tier as Profile['tier'],
    xp: row.xp as number,
    currentKairosCycleId: row.current_kairos_cycle_id as string | null,
    dateOfBirth: row.date_of_birth as string,
    squadId: row.squad_id as string | null,
    stripeCustomerId: row.stripe_customer_id as string | null,
    stripeSubscriptionId: row.stripe_subscription_id as string | null,
    subscriptionStatus: row.subscription_status as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCycle(row: Record<string, unknown>): KairosCycle {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string | null,
    status: row.status as KairosCycle['status'],
    totalXpEarned: row.total_xp_earned as number,
    completionPercentage: row.completion_percentage as number,
    createdAt: row.created_at as string,
  };
}

function mapFocus(row: Record<string, unknown>): UserDomainFocus {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    cycleId: row.cycle_id as string,
    domainType: row.domain_type as DomainType,
    focusDescription: row.focus_description as string,
    setAt: row.set_at as string,
  };
}

export function useBootstrap() {
  const { authUser, setProfile, setCurrentCycle, setDomainFocuses, setOnboardingComplete } =
    useAppStore();
  const bootstrapped = useRef<string | null>(null);

  useEffect(() => {
    if (!authUser || bootstrapped.current === authUser.id) return;
    bootstrapped.current = authUser.id;

    async function load() {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser!.id)
        .single();

      if (!profileRow) return;

      const profile = mapProfile(profileRow as Record<string, unknown>);
      setProfile(profile);
      setOnboardingComplete(true);

      if (!profile.currentKairosCycleId) return;

      const { data: cycleRow } = await supabase
        .from('kairos_cycles')
        .select('*')
        .eq('id', profile.currentKairosCycleId)
        .single();

      if (cycleRow) {
        setCurrentCycle(mapCycle(cycleRow as Record<string, unknown>));
      }

      const { data: focuses } = await supabase
        .from('user_domain_focuses')
        .select('*')
        .eq('user_id', authUser!.id)
        .eq('cycle_id', profile.currentKairosCycleId);

      if (focuses) {
        setDomainFocuses(focuses.map((f) => mapFocus(f as Record<string, unknown>)));
      }
    }

    load();
  }, [authUser?.id]);
}
