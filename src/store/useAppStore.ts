import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthUser,
  Profile,
  KairosCycle,
  UserDomainFocus,
  DailyCheckIn,
  UserStreak,
  AiNudge,
  DomainType,
  CheckInStatus,
  VibeCheck,
} from '@/types';
import { XP_PER_CHECK_IN_DONE, XP_PER_CHECK_IN_PARTIAL, XP_PER_CYCLE_COMPLETE } from '@/types';
import { supabase } from '@/services/supabaseClient';

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

  // Check-ins
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  streaks: Partial<Record<DomainType, UserStreak>>;
  // Persisted history for local streak computation (free tier)
  // Key: ISO date string. Kept to 90 days max.
  checkInHistory: Record<string, Partial<Record<DomainType, CheckInStatus>>>;

  // AI
  todayNudge: AiNudge | null;

  // Vibe check
  lastVibeCheckDate: string | null;

  // UI
  onboardingComplete: boolean;
}

// ─── Actions Shape ───────────────────────────────────────────────────────────

interface AppActions {
  setAuthUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsBootstrapLoading: (loading: boolean) => void;
  setCurrentCycle: (cycle: KairosCycle | null) => void;
  setDomainFocuses: (focuses: UserDomainFocus[]) => void;

  setDailyCheckIn: (
    domainType: DomainType,
    status: CheckInStatus,
    notes?: string,
  ) => Promise<void>;

  setTodayCheckIns: (checkIns: Partial<Record<DomainType, DailyCheckIn>>) => void;
  setTodayNudge: (nudge: AiNudge | null) => void;
  setNudgeStatus: (nudgeId: string, status: AiNudge['status']) => Promise<void>;

  mergeCheckInHistory: (entries: Record<string, Partial<Record<DomainType, CheckInStatus>>>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  submitVibeCheck: (rating: VibeCheck['rating']) => Promise<void>;
  completeCycle: (reflection: string) => Promise<void>;

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
  todayCheckIns: {},
  checkInHistory: {},
  streaks: {},
  todayNudge: null,
  lastVibeCheckDate: null,
  onboardingComplete: false,
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
      setTodayCheckIns: (todayCheckIns) => set({ todayCheckIns }),

      setDailyCheckIn: async (domainType, status, notes) => {
        const { profile, currentCycle, todayCheckIns } = get();
        if (!profile || !currentCycle) return;

        const today = new Date().toISOString().split('T')[0];
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
          const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0];
          for (const date of Object.keys(history)) {
            if (date < cutoff) delete history[date];
          }

          // Compute local streak for this domain.
          // Scan backwards through history to find both current streak and longest ever.
          // currentStreak: the unbroken run ending today (or 0 if today is empty).
          // longestStreak: max of all unbroken runs in the 90-day window.
          let currentStreak = 0;
          let longestStreak = 0;
          let running = 0;
          let pastCurrentStreak = false; // true once we've seen the first gap
          for (let i = 0; i < 90; i++) {
            const d = new Date(Date.now() - i * 86_400_000).toISOString().split('T')[0];
            const s = history[d]?.[domainType];
            if (s === 'Done' || s === 'Partial') {
              running++;
              if (!pastCurrentStreak) currentStreak = running;
            } else {
              if (running > longestStreak) longestStreak = running;
              running = 0;
              if (i === 0) pastCurrentStreak = true; // today is empty, current streak is 0
              else if (!pastCurrentStreak) pastCurrentStreak = true; // hit first gap
            }
          }
          longestStreak = Math.max(longestStreak, running);

          const updatedStreak: UserStreak = {
            userId: state.profile?.id ?? '',
            domainType,
            currentStreak,
            longestStreak,
            lastCheckInDate: today,
          };

          return {
            todayCheckIns: { ...state.todayCheckIns, [domainType]: optimisticCheckIn },
            checkInHistory: history,
            streaks: { ...state.streaks, [domainType]: updatedStreak },
            profile: state.profile
              ? { ...state.profile, xp: Math.max(0, state.profile.xp + xpDelta) }
              : null,
          };
        });

        if (profile.tier === 'free') return;

        // Sync to Supabase for Brotherhood tier
        const { error } = await supabase.from('daily_check_ins').upsert({
          user_id: profile.id,
          cycle_id: currentCycle.id,
          date: today,
          domain_type: domainType,
          status,
          notes: notes ?? null,
          xp_awarded: xpDelta,
        }, { onConflict: 'user_id,cycle_id,date,domain_type' });

        if (error) {
          console.error('Check-in sync failed:', error.message);
        } else if (xpDelta !== 0) {
          const newXp = Math.max(0, profile.xp + xpDelta);
          await supabase
            .from('profiles')
            .update({ xp: newXp })
            .eq('id', profile.id);
        }
      },

      setTodayNudge: (todayNudge) => set({ todayNudge }),

      setNudgeStatus: async (nudgeId, status) => {
        const { profile } = get();
        set((state) => ({
          todayNudge:
            state.todayNudge?.id === nudgeId
              ? { ...state.todayNudge, status }
              : state.todayNudge,
        }));
        if (!profile || profile.tier === 'free') return;
        await supabase
          .from('ai_nudges')
          .update({ status })
          .eq('id', nudgeId);
      },

      mergeCheckInHistory: (entries) =>
        set((state) => ({ checkInHistory: { ...state.checkInHistory, ...entries } })),

      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),

      submitVibeCheck: async (rating) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return;

        const today = new Date().toISOString().split('T')[0];
        set({ lastVibeCheckDate: today });

        if (profile.tier === 'free') return;

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

        const today = new Date().toISOString().split('T')[0];
        const completionXp = XP_PER_CYCLE_COMPLETE;

        set((state) => ({
          currentCycle: state.currentCycle
            ? { ...state.currentCycle, status: 'completed', endDate: today }
            : null,
          profile: state.profile
            ? { ...state.profile, xp: state.profile.xp + completionXp }
            : null,
        }));

        if (profile.tier === 'brotherhood') {
          await supabase.from('kairos_cycles').update({
            status: 'completed',
            end_date: today,
            total_xp_earned: currentCycle.totalXpEarned + completionXp,
          }).eq('id', currentCycle.id);

          await supabase.from('cycle_reflections').insert({
            user_id: profile.id,
            cycle_id: currentCycle.id,
            reflection_text: reflection,
            xp_awarded: completionXp,
          });

          await supabase.from('profiles').update({
            xp: profile.xp + completionXp,
          }).eq('id', profile.id);
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        get().reset();
      },

      reset: () => set(initialState),
    }),
    {
      name: '12k-app-store',
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        todayCheckIns: state.todayCheckIns,
        checkInHistory: state.checkInHistory,
        streaks: state.streaks,
        profile: state.profile,
        currentCycle: state.currentCycle,
        domainFocuses: state.domainFocuses,
        lastVibeCheckDate: state.lastVibeCheckDate,
      }),
    },
  ),
);
