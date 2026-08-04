import { supabase } from '@/services/supabaseClient';
import type {
  AuthUser,
  CheckInStatus,
  CustomRoute,
  CustomRouteCheckIn,
  DailyCheckIn,
  DomainType,
  JourneyArchiveEntry,
  KairosCycle,
  Profile,
  UserDomainFocus,
  UserStreak,
  VibeCheck,
} from '@/types';
import { XP_PER_CHECK_IN_DONE, XP_PER_CHECK_IN_PARTIAL, XP_PER_CYCLE_COMPLETE } from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { getLevelForXp } from '@/utils/gamification';
import { DEV_CYCLE_ID, clearLocalDevSession } from '@/utils/localDevSession';
import { computeLocalStreak } from '@/utils/streak';
import { toLocalIsoDate } from '@/utils/v1Framework';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  authUser: AuthUser | null;
  profile: Profile | null;
  isAuthLoading: boolean;
  isBootstrapLoading: boolean;

  // Cycle
  currentCycle: KairosCycle | null;
  domainFocuses: UserDomainFocus[];
  customRoutes: CustomRoute[];
  journeyArchive: JourneyArchiveEntry[];

  // Check-ins
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  todayCustomRouteCheckIns: Record<string, CustomRouteCheckIn>;
  streaks: Partial<Record<DomainType, UserStreak>>;
  // Persisted history for local streak computation (free tier)
  // Key: ISO date string. Kept to 90 days max.
  checkInHistory: Record<string, Partial<Record<DomainType, CheckInStatus>>>;
  customRouteCheckInHistory: Record<string, Record<string, CheckInStatus>>;

  // Vibe check
  lastVibeCheckDate: string | null;

  // UI
  onboardingComplete: boolean;
  // Set during Day 84 completion to keep the celebration modal visible while
  // the route guard would otherwise redirect to /new-cycle.
  celebrationPending: boolean;
  // Set when XP crosses a level boundary; cleared when user dismisses the card.
  levelUpPending: { level: number; label: string } | null;
  // Seeded from Day 84 reflection; shown on NewCycleScreen to prompt intention.
  nextCycleIntention: string | null;
  // Tracks the last KAIROS phase the user was shown a milestone banner for.
  // null = first load, phase not yet recorded.
  lastCelebrationPhase: string | null;
  profileImageDataUrl: string | null;
}

// ─── Actions Shape ───────────────────────────────────────────────────────────

interface AppActions {
  setAuthUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsBootstrapLoading: (loading: boolean) => void;
  setCurrentCycle: (cycle: KairosCycle | null) => void;
  setDomainFocuses: (focuses: UserDomainFocus[]) => void;
  updateDomainFocus: (domainType: DomainType, focusDescription: string) => Promise<void>;

  setDailyCheckIn: (domainType: DomainType, status: CheckInStatus, notes?: string) => Promise<void>;
  setCustomRouteCheckIn: (routeId: string, status: CheckInStatus, notes?: string) => Promise<void>;

  setTodayCheckIns: (checkIns: Partial<Record<DomainType, DailyCheckIn>>) => void;
  setTodayCustomRouteCheckIns: (checkIns: Record<string, CustomRouteCheckIn>) => void;
  setCustomRoutes: (routes: CustomRoute[]) => void;
  addCustomRoute: (route: {
    parentDomainType: DomainType;
    label: string;
    description?: string;
    focusDescription: string;
  }) => Promise<{
    ok: boolean;
    reason?: 'upgrade' | 'invalid' | 'missing-context' | 'sync-failed';
  }>;
  updateCustomRoute: (
    routeId: string,
    route: Partial<
      Pick<CustomRoute, 'parentDomainType' | 'label' | 'description' | 'focusDescription'>
    >,
  ) => Promise<void>;
  archiveCustomRoute: (routeId: string) => Promise<void>;
  archiveCurrentJourney: (reason: JourneyArchiveEntry['reason']) => void;

  mergeCheckInHistory: (
    entries: Record<string, Partial<Record<DomainType, CheckInStatus>>>,
  ) => void;
  mergeCustomRouteCheckInHistory: (entries: Record<string, Record<string, CheckInStatus>>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setCelebrationPending: (pending: boolean) => void;
  setLevelUpPending: (data: { level: number; label: string } | null) => void;
  setNextCycleIntention: (intention: string | null) => void;
  setLastCelebrationPhase: (phase: string | null) => void;
  setProfileImageDataUrl: (dataUrl: string | null) => void;
  submitVibeCheck: (rating: VibeCheck['rating']) => Promise<void>;
  completeCycle: (reflection: string) => Promise<void>;

  resetCycleLocalState: () => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AppState = {
  authUser: null,
  profile: null,
  isAuthLoading: true,
  isBootstrapLoading: false,
  currentCycle: null,
  domainFocuses: [],
  customRoutes: [],
  journeyArchive: [],
  todayCheckIns: {},
  todayCustomRouteCheckIns: {},
  checkInHistory: {},
  customRouteCheckInHistory: {},
  streaks: {},
  lastVibeCheckDate: null,
  onboardingComplete: false,
  celebrationPending: false,
  levelUpPending: null,
  nextCycleIntention: null,
  lastCelebrationPhase: null,
  profileImageDataUrl: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuthUser: (authUser) => set({ authUser, isAuthLoading: false }),
      setProfile: (profile) => set({ profile }),
      setIsBootstrapLoading: (isBootstrapLoading) => set({ isBootstrapLoading }),
      setCurrentCycle: (currentCycle) => set({ currentCycle }),
      setDomainFocuses: (domainFocuses) => set({ domainFocuses }),
      updateDomainFocus: async (domainType, focusDescription) => {
        const trimmed = focusDescription.trim();
        const { authUser, profile, currentCycle, domainFocuses } = get();
        if (!trimmed || !authUser || !profile || !currentCycle) return;

        const existing = domainFocuses.find((focus) => focus.domainType === domainType);
        const now = new Date().toISOString();
        const optimisticFocus: UserDomainFocus = existing
          ? { ...existing, focusDescription: trimmed }
          : {
              id: crypto.randomUUID(),
              userId: authUser.id,
              cycleId: currentCycle.id,
              domainType,
              focusDescription: trimmed,
              setAt: now,
            };

        set((state) => ({
          domainFocuses: existing
            ? state.domainFocuses.map((focus) =>
                focus.domainType === domainType ? optimisticFocus : focus,
              )
            : [...state.domainFocuses, optimisticFocus],
        }));

        if (profile.tier === 'free' || currentCycle.id === DEV_CYCLE_ID) return;

        const { data, error } = await supabase
          .from('user_domain_focuses')
          .upsert(
            {
              id: existing?.id,
              user_id: authUser.id,
              cycle_id: currentCycle.id,
              domain_type: domainType,
              focus_description: trimmed,
            },
            { onConflict: 'user_id,cycle_id,domain_type' },
          )
          .select()
          .single();

        if (error || !data) {
          console.error('Domain focus sync failed:', error?.message ?? 'No row returned');
          return;
        }

        set((state) => ({
          domainFocuses: state.domainFocuses.map((focus) =>
            focus.domainType === domainType
              ? {
                  id: data.id,
                  userId: authUser.id,
                  cycleId: currentCycle.id,
                  domainType,
                  focusDescription: trimmed,
                  setAt: data.set_at,
                }
              : focus,
          ),
        }));
      },
      setTodayCheckIns: (todayCheckIns) => set({ todayCheckIns }),
      setTodayCustomRouteCheckIns: (todayCustomRouteCheckIns) => set({ todayCustomRouteCheckIns }),
      setCustomRoutes: (customRoutes) => set({ customRoutes }),
      setDailyCheckIn: async (domainType, status, notes) => {
        const { profile, currentCycle, todayCheckIns } = get();
        if (!profile || !currentCycle) return;

        const today = toLocalIsoDate(new Date());
        const xpForStatus = (s: CheckInStatus | undefined): number =>
          s === 'Done' ? XP_PER_CHECK_IN_DONE : s === 'Partial' ? XP_PER_CHECK_IN_PARTIAL : 0;
        const previousStatus = todayCheckIns[domainType]?.status;
        const xpDelta = xpForStatus(status) - xpForStatus(previousStatus);

        // Optimistic update
        const optimisticCheckIn: DailyCheckIn = {
          id: crypto.randomUUID(),
          userId: profile.id,
          cycleId: currentCycle.id,
          date: today,
          domainType,
          status,
          notes: notes ?? null,
          xpAwarded: xpDelta,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          // Update history (keep 90 days)
          const history = { ...state.checkInHistory };
          history[today] = { ...(history[today] ?? {}), [domainType]: status };
          const cutoff = toLocalIsoDate(new Date(Date.now() - 400 * 86_400_000));
          for (const date of Object.keys(history)) {
            if (date < cutoff) delete history[date];
          }

          const { currentStreak, longestStreak } = computeLocalStreak(history, domainType, today);

          const updatedStreak: UserStreak = {
            userId: state.profile?.id ?? '',
            domainType,
            currentStreak,
            longestStreak,
            lastCheckInDate: today,
          };

          const oldXp = state.profile?.xp ?? 0;
          const newXp = Math.max(0, oldXp + xpDelta);
          const oldLevel = getLevelForXp(oldXp);
          const newLevel = getLevelForXp(newXp);

          return {
            todayCheckIns: { ...state.todayCheckIns, [domainType]: optimisticCheckIn },
            checkInHistory: history,
            streaks: { ...state.streaks, [domainType]: updatedStreak },
            currentCycle: state.currentCycle
              ? {
                  ...state.currentCycle,
                  totalXpEarned: Math.max(0, state.currentCycle.totalXpEarned + xpDelta),
                }
              : null,
            profile: state.profile ? { ...state.profile, xp: newXp } : null,
            levelUpPending:
              newLevel.level > oldLevel.level
                ? { level: newLevel.level, label: newLevel.label }
                : state.levelUpPending,
          };
        });

        if (profile.tier === 'free' || currentCycle.id === DEV_CYCLE_ID) return;

        // Sync to Supabase for paid tiers
        const { error } = await supabase.from('daily_check_ins').upsert(
          {
            user_id: profile.id,
            cycle_id: currentCycle.id,
            date: today,
            domain_type: domainType,
            status,
            notes: notes ?? null,
            xp_awarded: xpDelta,
          },
          { onConflict: 'user_id,cycle_id,date,domain_type' },
        );

        if (error) {
          console.error('Check-in sync failed:', error.message);
        } else if (xpDelta !== 0) {
          await supabase.rpc('increment_profile_xp', { p_user_id: profile.id, p_delta: xpDelta });
        }
      },

      addCustomRoute: async ({ parentDomainType, label, description, focusDescription }) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return { ok: false, reason: 'missing-context' };
        if (!hasBrotherhoodAccess(profile.tier)) return { ok: false, reason: 'upgrade' };

        const now = new Date().toISOString();
        const route: CustomRoute = {
          id: crypto.randomUUID(),
          userId: profile.id,
          cycleId: currentCycle.id,
          parentDomainType,
          label: label.trim(),
          description: description?.trim() ?? '',
          focusDescription: focusDescription.trim(),
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };

        if (!route.label || !route.focusDescription) return { ok: false, reason: 'invalid' };
        set((state) => ({ customRoutes: [...state.customRoutes, route] }));

        if (currentCycle.id === DEV_CYCLE_ID) return { ok: true };

        const { data, error } = await supabase
          .from('custom_routes')
          .insert({
            id: route.id,
            user_id: profile.id,
            cycle_id: currentCycle.id,
            parent_domain_type: parentDomainType,
            label: route.label,
            description: route.description,
            focus_description: route.focusDescription,
          })
          .select()
          .single();

        if (error || !data) {
          console.error('Custom route sync failed:', error?.message ?? 'No row returned');
          set((state) => ({
            customRoutes: state.customRoutes.filter((existing) => existing.id !== route.id),
          }));
          return { ok: false, reason: 'sync-failed' };
        }

        set((state) => ({
          customRoutes: state.customRoutes.map((existing) =>
            existing.id === route.id
              ? {
                  ...existing,
                  parentDomainType: data.parent_domain_type as DomainType,
                  label: data.label,
                  description: data.description ?? '',
                  focusDescription: data.focus_description,
                  createdAt: data.created_at,
                  updatedAt: data.updated_at,
                  archivedAt: data.archived_at,
                }
              : existing,
          ),
        }));
        return { ok: true };
      },

      updateCustomRoute: async (routeId, route) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle || !hasBrotherhoodAccess(profile.tier)) return;
        const now = new Date().toISOString();
        set((state) => ({
          customRoutes: state.customRoutes.map((existing) =>
            existing.id === routeId
              ? {
                  ...existing,
                  ...route,
                  label: route.label?.trim() ?? existing.label,
                  description: route.description?.trim() ?? existing.description,
                  focusDescription: route.focusDescription?.trim() ?? existing.focusDescription,
                  updatedAt: now,
                }
              : existing,
          ),
        }));

        if (currentCycle.id === DEV_CYCLE_ID) return;

        const payload: Record<string, string> = { updated_at: now };
        if (route.parentDomainType) payload.parent_domain_type = route.parentDomainType;
        if (route.label !== undefined) payload.label = route.label.trim();
        if (route.description !== undefined) payload.description = route.description.trim();
        if (route.focusDescription !== undefined) {
          payload.focus_description = route.focusDescription.trim();
        }

        const { error } = await supabase
          .from('custom_routes')
          .update(payload)
          .eq('id', routeId)
          .eq('user_id', profile.id);

        if (error) console.error('Custom route update sync failed:', error.message);
      },

      archiveCustomRoute: async (routeId) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return;
        const archivedAt = new Date().toISOString();
        set((state) => {
          return {
            customRoutes: state.customRoutes.map((route) =>
              route.id === routeId ? { ...route, archivedAt, updatedAt: archivedAt } : route,
            ),
          };
        });

        if (!hasBrotherhoodAccess(profile.tier) || currentCycle.id === DEV_CYCLE_ID) return;

        const { error } = await supabase
          .from('custom_routes')
          .update({ archived_at: archivedAt, updated_at: archivedAt })
          .eq('id', routeId)
          .eq('user_id', profile.id);

        if (error) console.error('Custom route archive sync failed:', error.message);
      },

      setCustomRouteCheckIn: async (routeId, status, notes) => {
        const { profile, currentCycle, customRoutes, todayCustomRouteCheckIns } = get();
        if (!profile || !currentCycle) return;
        if (!hasBrotherhoodAccess(profile.tier)) return;
        const route = customRoutes.find((r) => r.id === routeId && !r.archivedAt);
        if (!route) return;

        const today = toLocalIsoDate(new Date());
        const now = new Date().toISOString();
        const xpForStatus = (s: CheckInStatus | undefined): number =>
          s === 'Done' ? XP_PER_CHECK_IN_DONE : s === 'Partial' ? XP_PER_CHECK_IN_PARTIAL : 0;
        const previous = todayCustomRouteCheckIns[routeId];
        const previousStatus = previous?.date === today ? previous.status : undefined;
        const xpDelta = xpForStatus(status) - xpForStatus(previousStatus);
        const oldXp = profile.xp;
        const newXp = Math.max(0, oldXp + xpDelta);
        const oldLevel = getLevelForXp(oldXp);
        const newLevel = getLevelForXp(newXp);

        const checkIn: CustomRouteCheckIn = {
          id: previous?.id ?? crypto.randomUUID(),
          userId: profile.id,
          cycleId: currentCycle.id,
          routeId,
          date: today,
          status,
          notes: notes ?? null,
          xpAwarded: xpDelta,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };

        set((state) => ({
          todayCustomRouteCheckIns: {
            ...state.todayCustomRouteCheckIns,
            [routeId]: checkIn,
          },
          customRouteCheckInHistory: {
            ...state.customRouteCheckInHistory,
            [today]: {
              ...(state.customRouteCheckInHistory[today] ?? {}),
              [routeId]: status,
            },
          },
          currentCycle: state.currentCycle
            ? {
                ...state.currentCycle,
                totalXpEarned: Math.max(0, state.currentCycle.totalXpEarned + xpDelta),
              }
            : null,
          profile: state.profile ? { ...state.profile, xp: newXp } : null,
          levelUpPending:
            newLevel.level > oldLevel.level
              ? { level: newLevel.level, label: newLevel.label }
              : state.levelUpPending,
        }));

        if (currentCycle.id === DEV_CYCLE_ID) return;

        const { data, error } = await supabase
          .from('custom_route_check_ins')
          .upsert(
            {
              id: checkIn.id,
              user_id: profile.id,
              cycle_id: currentCycle.id,
              route_id: routeId,
              date: today,
              status,
              notes: notes ?? null,
              xp_awarded: xpDelta,
            },
            { onConflict: 'user_id,cycle_id,date,route_id' },
          )
          .select()
          .single();

        if (error || !data) {
          console.error('Custom route check-in sync failed:', error?.message ?? 'No row returned');
        } else {
          set((state) => ({
            todayCustomRouteCheckIns: {
              ...state.todayCustomRouteCheckIns,
              [routeId]: {
                id: data.id,
                userId: data.user_id,
                cycleId: data.cycle_id,
                routeId: data.route_id,
                date: data.date,
                status: data.status,
                notes: data.notes,
                xpAwarded: data.xp_awarded,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
              },
            },
          }));
        }

        if (xpDelta !== 0) {
          await supabase.rpc('increment_profile_xp', { p_user_id: profile.id, p_delta: xpDelta });
        }
      },

      archiveCurrentJourney: (reason) =>
        set((state) => {
          if (!state.currentCycle) return state;
          const today = toLocalIsoDate(new Date());
          const archivedAt = new Date().toISOString();
          const entry: JourneyArchiveEntry = {
            id: crypto.randomUUID(),
            archivedAt,
            reason,
            cycleId: state.currentCycle.id,
            startDate: state.currentCycle.startDate,
            endDate: today,
            xp: state.currentCycle.totalXpEarned,
            domainFocuses: state.domainFocuses.map((focus) => ({
              domainType: focus.domainType,
              focusDescription: focus.focusDescription,
            })),
            customRoutes: state.customRoutes.map((route) => ({
              parentDomainType: route.parentDomainType,
              label: route.label,
              description: route.description,
              focusDescription: route.focusDescription,
            })),
            checkInHistory: state.checkInHistory,
            customRouteCheckInHistory: state.customRouteCheckInHistory,
          };

          return { journeyArchive: [entry, ...state.journeyArchive].slice(0, 12) };
        }),

      mergeCheckInHistory: (entries) =>
        set((state) => ({ checkInHistory: { ...state.checkInHistory, ...entries } })),
      mergeCustomRouteCheckInHistory: (entries) =>
        set((state) => ({
          customRouteCheckInHistory: { ...state.customRouteCheckInHistory, ...entries },
        })),

      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
      setCelebrationPending: (celebrationPending) => set({ celebrationPending }),
      setLevelUpPending: (levelUpPending) => set({ levelUpPending }),
      setNextCycleIntention: (nextCycleIntention) => set({ nextCycleIntention }),
      setLastCelebrationPhase: (lastCelebrationPhase) => set({ lastCelebrationPhase }),
      setProfileImageDataUrl: (profileImageDataUrl) => set({ profileImageDataUrl }),

      submitVibeCheck: async (rating) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return;

        const today = toLocalIsoDate(new Date());
        set({ lastVibeCheckDate: today });

        if (profile.tier === 'free' || currentCycle.id === DEV_CYCLE_ID) return;

        const { error } = await supabase.from('vibe_checks').insert({
          user_id: profile.id,
          cycle_id: currentCycle.id,
          date: today,
          rating,
        });

        if (error) {
          console.error('Vibe check sync failed:', error.message);
        }
      },

      completeCycle: async (reflection) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return;

        const today = toLocalIsoDate(new Date());
        const completionXp = XP_PER_CYCLE_COMPLETE;

        set((state) => ({
          currentCycle: state.currentCycle
            ? { ...state.currentCycle, status: 'completed', endDate: today }
            : null,
          profile: state.profile ? { ...state.profile, xp: state.profile.xp + completionXp } : null,
          celebrationPending: true,
        }));

        if (currentCycle.id === DEV_CYCLE_ID) return;

        // All tiers: persist cycle status so bootstrap doesn't reload it as 'active' on next login.
        await supabase
          .from('kairos_cycles')
          .update({
            status: 'completed',
            end_date: today,
            total_xp_earned: currentCycle.totalXpEarned + completionXp,
          })
          .eq('id', currentCycle.id);

        if (hasBrotherhoodAccess(profile.tier)) {
          await supabase.from('cycle_reflections').insert({
            user_id: profile.id,
            cycle_id: currentCycle.id,
            reflection_text: reflection,
            xp_awarded: completionXp,
          });

          await supabase.rpc('increment_profile_xp', {
            p_user_id: profile.id,
            p_delta: completionXp,
          });
        }
      },

      // Clears per-cycle local state when a new cycle begins so streak history
      // from the previous cycle doesn't bleed into the new one.
      resetCycleLocalState: () =>
        set({
          checkInHistory: {},
          customRouteCheckInHistory: {},
          todayCheckIns: {},
          todayCustomRouteCheckIns: {},
          domainFocuses: [],
          customRoutes: [],
          streaks: {},
          nextCycleIntention: null,
        }),

      signOut: async () => {
        clearLocalDevSession();
        // reset() before signOut so the auth listener's setAuthUser(null) call
        // (which fires synchronously inside signOut) runs AFTER isAuthLoading is
        // already true, and its isAuthLoading: false write is the final write.
        // If the order were reversed, reset() would overwrite isAuthLoading back
        // to true after the listener already set it to false, causing a permanent splash.
        get().reset();
        await supabase.auth.signOut();
      },

      reset: () => set(initialState),
    }),
    {
      name: '12k-app-store',
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        todayCheckIns: state.todayCheckIns,
        todayCustomRouteCheckIns: state.todayCustomRouteCheckIns,
        checkInHistory: state.checkInHistory,
        customRouteCheckInHistory: state.customRouteCheckInHistory,
        streaks: state.streaks,
        profile: state.profile,
        currentCycle: state.currentCycle,
        domainFocuses: state.domainFocuses,
        customRoutes: state.customRoutes,
        journeyArchive: state.journeyArchive,
        lastVibeCheckDate: state.lastVibeCheckDate,
        nextCycleIntention: state.nextCycleIntention,
        lastCelebrationPhase: state.lastCelebrationPhase,
        profileImageDataUrl: state.profileImageDataUrl,
      }),
    },
  ),
);
