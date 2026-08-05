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
import * as Sentry from '@sentry/react';
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

const BOOTSTRAP_TIMEOUT_MS = 8_000;
const BOOTSTRAP_TIMEOUT_MESSAGE =
  'Kairos is taking longer than expected to load. Check your connection and retry.';
const CRITICAL_BOOTSTRAP_MESSAGE =
  'Kairos could not load your profile. Check your connection and retry.';

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

class CriticalBootstrapError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string) {
    super(userMessage);
    this.name = 'CriticalBootstrapError';
    this.userMessage = userMessage;
  }
}

function isNoRowsError(error: SupabaseErrorLike | null | undefined): boolean {
  return error?.code === 'PGRST116';
}

function describeBootstrapError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function captureBootstrapError(context: string, error: unknown, critical: boolean) {
  const message = describeBootstrapError(error);
  console.error(`Bootstrap ${context} failed:`, message);
  Sentry.captureException(error instanceof Error ? error : new Error(message), {
    tags: {
      area: 'bootstrap',
      critical: critical ? 'true' : 'false',
    },
    extra: { context },
  });
}

function failCriticalBootstrap(context: string, error: unknown): never {
  captureBootstrapError(context, error, true);
  throw new CriticalBootstrapError(CRITICAL_BOOTSTRAP_MESSAGE);
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
    setBootstrapError,
    flushPendingSync,
  } = useAppStore();
  const bootstrapped = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per auth session via ref guard; store setters are stable
  useEffect(() => {
    if (!authUser) {
      bootstrapped.current = null;
      setBootstrapError(null);
      return;
    }
    if (bootstrapped.current === authUser.id) return;
    const user = authUser;
    bootstrapped.current = authUser.id;
    setIsBootstrapLoading(true);
    setBootstrapError(null);
    let cancelled = false;
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled || settled) return;
      captureBootstrapError(
        'timeout',
        new Error(`Bootstrap exceeded ${BOOTSTRAP_TIMEOUT_MS}ms`),
        true,
      );
      setBootstrapError(BOOTSTRAP_TIMEOUT_MESSAGE);
      setIsBootstrapLoading(false);
    }, BOOTSTRAP_TIMEOUT_MS);

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

    if (isLocalDevUser(user.id)) {
      settled = true;
      window.clearTimeout(timeoutId);
      setIsBootstrapLoading(false);
      return;
    }

    async function load() {
      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileErr && !isNoRowsError(profileErr)) {
        failCriticalBootstrap('profile query', profileErr);
      }

      if (!profileRow) {
        setProfile(null);
        setCurrentCycle(null);
        setOnboardingComplete(false);
        return;
      }

      let mapped = mapProfile(profileRow as Record<string, unknown>);
      if (
        hasComplimentaryBrotherhood(user.email) &&
        (!hasBrotherhoodAccess(mapped.tier) || mapped.subscriptionStatus !== 'active')
      ) {
        const { data: updatedProfileRow, error: entitlementErr } = await supabase.rpc(
          'claim_complimentary_lifechanger',
        );

        if (updatedProfileRow) {
          mapped = mapProfile(updatedProfileRow as Record<string, unknown>);
        } else {
          if (entitlementErr) {
            captureBootstrapError('complimentary entitlement sync', entitlementErr, false);
          }
          mapped = applyComplimentaryBrotherhood(user.email, mapped);
        }
      }
      // Preserve locally accumulated XP if the remote row is behind, so reloads
      // do not make progress appear to go backwards.
      const localProfile = useAppStore.getState().profile;
      const profile =
        localProfile?.id === mapped.id && localProfile.xp > mapped.xp
          ? { ...mapped, xp: localProfile.xp }
          : mapped;
      setProfile(profile);

      let cycleId = profile.currentKairosCycleId;
      let cycleRow: Record<string, unknown> | null = null;

      if (cycleId) {
        const { data, error: cycleErr } = await supabase
          .from('kairos_cycles')
          .select('*')
          .eq('id', cycleId)
          .single();
        if (cycleErr && !isNoRowsError(cycleErr)) {
          failCriticalBootstrap('current cycle query', cycleErr);
        }
        if (data) cycleRow = data as Record<string, unknown>;
      }

      if (!cycleRow) {
        const { data: activeCycle, error: activeCycleErr } = await supabase
          .from('kairos_cycles')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeCycleErr && !isNoRowsError(activeCycleErr)) {
          failCriticalBootstrap('active cycle recovery', activeCycleErr);
        }

        if (activeCycle) {
          cycleRow = activeCycle as Record<string, unknown>;
          cycleId = cycleRow.id as string;

          const repairedProfile = { ...profile, currentKairosCycleId: cycleId };
          setProfile(repairedProfile);

          const { error: linkErr } = await supabase
            .from('profiles')
            .update({ current_kairos_cycle_id: cycleId })
            .eq('id', user.id);

          if (linkErr) {
            captureBootstrapError('current cycle link repair', linkErr, false);
          }
        }
      }

      // Only mark onboarding complete if a real cycle can be loaded or recovered.
      // The handle_new_user trigger creates a minimal profile with no cycle;
      // without this check, new users would bypass OnboardingFlow.
      if (!cycleId || !cycleRow) {
        setCurrentCycle(null);
        setOnboardingComplete(false);
        return;
      }

      const cycle = mapCycle(cycleRow);
      setCurrentCycle(cycle);
      setOnboardingComplete(true);

      const { data: focuses, error: focusesErr } = await supabase
        .from('user_domain_focuses')
        .select('*')
        .eq('user_id', user.id)
        .eq('cycle_id', cycle.id);

      if (focusesErr) {
        captureBootstrapError('domain focuses query', focusesErr, false);
      } else if (focuses) {
        setDomainFocuses(focuses.map((f) => mapFocus(f as Record<string, unknown>)));
      }

      // Paid tiers: reload recent check-ins from Supabase (cross-device sync + history backfill)
      if (hasBrotherhoodAccess(profile.tier)) {
        const { data: routeRows, error: routeRowsErr } = await supabase
          .from('custom_routes')
          .select('*')
          .eq('user_id', user.id)
          .eq('cycle_id', cycle.id)
          .order('created_at', { ascending: true });

        if (routeRowsErr) {
          captureBootstrapError('custom routes query', routeRowsErr, false);
        } else if (routeRows) {
          setCustomRoutes(routeRows.map((row) => mapCustomRoute(row as Record<string, unknown>)));
        }

        const sevenDaysAgo = toLocalIsoDate(new Date(Date.now() - 6 * 86_400_000));
        const { data: checkIns, error: checkInsErr } = await supabase
          .from('daily_check_ins')
          .select('*')
          .eq('user_id', user.id)
          .eq('cycle_id', cycle.id)
          .gte('date', sevenDaysAgo)
          .lte('date', today);

        if (checkInsErr) {
          captureBootstrapError('daily check-ins query', checkInsErr, false);
        } else if (checkIns && checkIns.length > 0) {
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

        const { data: customCheckIns, error: customCheckInsErr } = await supabase
          .from('custom_route_check_ins')
          .select('*')
          .eq('user_id', user.id)
          .eq('cycle_id', cycle.id)
          .gte('date', sevenDaysAgo)
          .lte('date', today);

        if (customCheckInsErr) {
          captureBootstrapError('custom route check-ins query', customCheckInsErr, false);
        } else if (customCheckIns && customCheckIns.length > 0) {
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
      .then(async () => {
        try {
          await flushPendingSync();
        } catch (error) {
          captureBootstrapError('offline queue flush', error, false);
        }
        if (!cancelled) setBootstrapError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof CriticalBootstrapError) {
          setBootstrapError(error.userMessage);
          return;
        }
        captureBootstrapError('unexpected load', error, true);
        setBootstrapError(CRITICAL_BOOTSTRAP_MESSAGE);
      })
      .finally(() => {
        settled = true;
        window.clearTimeout(timeoutId);
        if (!cancelled) setIsBootstrapLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [authUser?.id]);
}
