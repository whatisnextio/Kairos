import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type {
  CheckInStatus,
  CustomRoute,
  CustomRouteCheckIn,
  DailyCheckIn,
  DomainType,
  KairosCycle,
  Profile,
  UserDomainFocus,
} from '@/types';
import {
  applyComplimentaryBrotherhood,
  hasBrotherhoodAccess,
  hasComplimentaryBrotherhood,
} from '@/utils/entitlements';
import { isLocalDevUser } from '@/utils/localDevSession';
import { toLocalIsoDate } from '@/utils/v1Framework';
import { useEffect, useRef } from 'react';

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
    cancelAtPeriodEnd: (row.cancel_at_period_end as boolean | null) ?? false,
    currentPeriodEnd: row.current_period_end as string | null,
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

function mapCheckIn(row: Record<string, unknown>): DailyCheckIn {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    cycleId: row.cycle_id as string,
    date: row.date as string,
    domainType: row.domain_type as DomainType,
    status: row.status as CheckInStatus,
    notes: row.notes as string | null,
    xpAwarded: row.xp_awarded as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCustomRoute(row: Record<string, unknown>): CustomRoute {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    cycleId: row.cycle_id as string,
    parentDomainType: row.parent_domain_type as DomainType,
    label: row.label as string,
    description: (row.description as string | null) ?? '',
    focusDescription: row.focus_description as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
  };
}

function mapCustomRouteCheckIn(row: Record<string, unknown>): CustomRouteCheckIn {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    cycleId: row.cycle_id as string,
    routeId: row.route_id as string,
    date: row.date as string,
    status: row.status as CheckInStatus,
    notes: row.notes as string | null,
    xpAwarded: row.xp_awarded as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useBootstrap() {
  const {
    authUser,
    todayCheckIns,
    todayCustomRouteCheckIns,
    setProfile,
    setCurrentCycle,
    setDomainFocuses,
    setCustomRoutes,
    setOnboardingComplete,
    setTodayCheckIns,
    setTodayCustomRouteCheckIns,
    mergeCheckInHistory,
    mergeCustomRouteCheckInHistory,
    setIsBootstrapLoading,
    flushPendingSync,
  } = useAppStore();
  const bootstrapped = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per auth session via ref guard; store setters are stable
  useEffect(() => {
    if (!authUser) {
      bootstrapped.current = null;
      return;
    }
    if (bootstrapped.current === authUser.id) return;
    bootstrapped.current = authUser.id;
    setIsBootstrapLoading(true);

    const today = toLocalIsoDate(new Date());

    // Clear stale check-ins from a previous day (persisted in localStorage)
    const anyCheckIn = Object.values(todayCheckIns)[0];
    if (anyCheckIn && anyCheckIn.date !== today) {
      setTodayCheckIns({});
    }
    const anyCustomRouteCheckIn = Object.values(todayCustomRouteCheckIns)[0];
    if (anyCustomRouteCheckIn && anyCustomRouteCheckIn.date !== today) {
      setTodayCustomRouteCheckIns({});
    }

    if (isLocalDevUser(authUser.id)) {
      setIsBootstrapLoading(false);
      return;
    }

    async function load() {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser?.id)
        .single();

      if (!profileRow) return;

      let mapped = mapProfile(profileRow as Record<string, unknown>);
      if (
        hasComplimentaryBrotherhood(authUser?.email) &&
        (!hasBrotherhoodAccess(mapped.tier) || mapped.subscriptionStatus !== 'active')
      ) {
        const { data: updatedProfileRow, error: entitlementErr } = await supabase.rpc(
          'claim_complimentary_lifechanger',
        );

        if (updatedProfileRow) {
          mapped = mapProfile(updatedProfileRow as Record<string, unknown>);
        } else {
          console.error('Complimentary entitlement sync failed:', entitlementErr?.message);
          mapped = applyComplimentaryBrotherhood(authUser?.email, mapped);
        }
      }
      // Free users never sync XP to Supabase. Preserve locally accumulated XP
      // so logins don't reset it back to the Supabase default.
      const localProfile = useAppStore.getState().profile;
      const profile =
        mapped.tier === 'free' && localProfile?.id === mapped.id && localProfile.xp > mapped.xp
          ? { ...mapped, xp: localProfile.xp }
          : mapped;
      setProfile(profile);
      // Only mark onboarding complete if the user has a cycle.
      // The handle_new_user trigger creates a minimal profile with no cycle;
      // without this check, new users would bypass OnboardingFlow.
      setOnboardingComplete(!!profile.currentKairosCycleId);

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
        .eq('user_id', authUser?.id)
        .eq('cycle_id', profile.currentKairosCycleId);

      if (focuses) {
        setDomainFocuses(focuses.map((f) => mapFocus(f as Record<string, unknown>)));
      }

      // Paid tiers: reload recent check-ins from Supabase (cross-device sync + history backfill)
      if (hasBrotherhoodAccess(profile.tier)) {
        const { data: routeRows } = await supabase
          .from('custom_routes')
          .select('*')
          .eq('user_id', authUser?.id)
          .eq('cycle_id', profile.currentKairosCycleId)
          .order('created_at', { ascending: true });

        if (routeRows) {
          setCustomRoutes(routeRows.map((row) => mapCustomRoute(row as Record<string, unknown>)));
        }

        const sevenDaysAgo = toLocalIsoDate(new Date(Date.now() - 6 * 86_400_000));
        const { data: checkIns } = await supabase
          .from('daily_check_ins')
          .select('*')
          .eq('user_id', authUser?.id)
          .eq('cycle_id', profile.currentKairosCycleId)
          .gte('date', sevenDaysAgo)
          .lte('date', today);

        if (checkIns && checkIns.length > 0) {
          const mapped = checkIns.map((c) => mapCheckIn(c as Record<string, unknown>));

          // Set today's check-ins for optimistic UI
          const todayOnly: Partial<Record<DomainType, DailyCheckIn>> = {};
          for (const ci of mapped) {
            if (ci.date === today) todayOnly[ci.domainType] = ci;
          }
          if (Object.keys(todayOnly).length > 0) setTodayCheckIns(todayOnly);

          // Backfill checkInHistory so ProgressScreen 7-day grid works on fresh install
          const historyEntries: Record<string, Partial<Record<DomainType, CheckInStatus>>> = {};
          for (const ci of mapped) {
            if (!historyEntries[ci.date]) historyEntries[ci.date] = {};
            historyEntries[ci.date][ci.domainType] = ci.status;
          }
          mergeCheckInHistory(historyEntries);
        }

        const { data: customCheckIns } = await supabase
          .from('custom_route_check_ins')
          .select('*')
          .eq('user_id', authUser?.id)
          .eq('cycle_id', profile.currentKairosCycleId)
          .gte('date', sevenDaysAgo)
          .lte('date', today);

        if (customCheckIns && customCheckIns.length > 0) {
          const mapped = customCheckIns.map((c) =>
            mapCustomRouteCheckIn(c as Record<string, unknown>),
          );
          const todayOnly: Record<string, CustomRouteCheckIn> = {};
          const historyEntries: Record<string, Record<string, CheckInStatus>> = {};

          for (const ci of mapped) {
            if (ci.date === today) todayOnly[ci.routeId] = ci;
            historyEntries[ci.date] = {
              ...(historyEntries[ci.date] ?? {}),
              [ci.routeId]: ci.status,
            };
          }

          if (Object.keys(todayOnly).length > 0) setTodayCustomRouteCheckIns(todayOnly);
          mergeCustomRouteCheckInHistory(historyEntries);
        }
      }
    }

    load()
      .then(() => flushPendingSync())
      .finally(() => setIsBootstrapLoading(false));
  }, [authUser?.id]);
}
