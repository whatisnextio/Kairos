import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  normaliseNotificationPreferences,
} from '@/services/localNotifications';
import {
  type OfflineMutation,
  deleteOfflineMutation,
  enqueueOfflineMutation,
  getPendingOfflineMutationCount,
  listPendingOfflineMutations,
  markOfflineMutationFailed,
} from '@/services/offlineQueue';
import { supabase } from '@/services/supabaseClient';
import type {
  AuthUser,
  CheckInStatus,
  CustomRoute,
  CustomRouteCheckIn,
  DailyCheckIn,
  DomainType,
  ImproveCardSnapshot,
  JourneyArchiveEntry,
  KairosCycle,
  NudgeStatus,
  Profile,
  UserDomainFocus,
  UserStreak,
  VibeCheck,
} from '@/types';
import { XP_PER_CYCLE_COMPLETE, XP_PER_WEEK_COMPLETE } from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import {
  getFortnightBlockKey,
  getLevelForXp,
  getWeekKey,
  getXpForCheckInStatus,
  shouldAwardWeeklyBonus,
} from '@/utils/gamification';
import { DEV_CYCLE_ID, clearLocalDevSession } from '@/utils/localDevSession';
import { DEFAULT_SHARE_PRIVACY, type SharePrivacyPreferences } from '@/utils/shareProgress';
import { computeLocalStreak } from '@/utils/streak';
import { type ThemePreference, normaliseThemePreference } from '@/utils/theme';
import { toLocalIsoDate } from '@/utils/v1Framework';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type OfflineSyncStatus = 'idle' | 'pending' | 'syncing' | 'error' | 'degraded';

interface CheckInNoteOverride {
  checkInId: string;
  domainType: DomainType;
  date: string;
  notes: string | null;
  updatedAt: string;
}

interface DailyCheckInMutationPayload {
  id: string;
  date: string;
  domainType: DomainType;
  status: CheckInStatus;
  notes: string | null;
  xpDelta: number;
  totalSyncDelta: number;
  updatedAt: string;
}

interface DailyCheckInNoteMutationPayload {
  checkInId: string;
  notes: string | null;
  updatedAt: string;
}

interface CustomRouteCheckInMutationPayload {
  id: string;
  routeId: string;
  date: string;
  status: CheckInStatus;
  notes: string | null;
  xpDelta: number;
  updatedAt: string;
}

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function syncOfflineMutation(mutation: OfflineMutation): Promise<void> {
  if (mutation.type === 'daily_check_in') {
    const payload = mutation.payload as unknown as DailyCheckInMutationPayload;
    const { error } = await supabase.from('daily_check_ins').upsert(
      {
        id: payload.id,
        user_id: mutation.userId,
        cycle_id: mutation.cycleId,
        date: payload.date,
        domain_type: payload.domainType,
        status: payload.status,
        notes: payload.notes,
        xp_awarded: payload.xpDelta,
        updated_at: payload.updatedAt,
      },
      { onConflict: 'user_id,cycle_id,date,domain_type' },
    );
    if (error) throw new Error(error.message);
    if (payload.totalSyncDelta !== 0) {
      const { error: xpError } = await supabase.rpc('increment_profile_xp', {
        p_user_id: mutation.userId,
        p_delta: payload.totalSyncDelta,
      });
      if (xpError) throw new Error(xpError.message);
    }
    return;
  }

  if (mutation.type === 'daily_check_in_note') {
    const payload = mutation.payload as unknown as DailyCheckInNoteMutationPayload;
    const { error } = await supabase
      .from('daily_check_ins')
      .update({ notes: payload.notes, updated_at: payload.updatedAt })
      .eq('id', payload.checkInId)
      .eq('user_id', mutation.userId);
    if (error) throw new Error(error.message);
    return;
  }

  if (mutation.type === 'custom_route_check_in') {
    const payload = mutation.payload as unknown as CustomRouteCheckInMutationPayload;
    const { data, error } = await supabase
      .from('custom_route_check_ins')
      .upsert(
        {
          id: payload.id,
          user_id: mutation.userId,
          cycle_id: mutation.cycleId,
          route_id: payload.routeId,
          date: payload.date,
          status: payload.status,
          notes: payload.notes,
          xp_awarded: payload.xpDelta,
          updated_at: payload.updatedAt,
        },
        { onConflict: 'user_id,cycle_id,date,route_id' },
      )
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'No row returned');
    if (payload.xpDelta !== 0) {
      const { error: xpError } = await supabase.rpc('increment_profile_xp', {
        p_user_id: mutation.userId,
        p_delta: payload.xpDelta,
      });
      if (xpError) throw new Error(xpError.message);
    }
  }
}

// ─── State Shape ─────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  authUser: AuthUser | null;
  profile: Profile | null;
  isAuthLoading: boolean;
  isBootstrapLoading: boolean;
  bootstrapError: string | null;

  // Cycle
  currentCycle: KairosCycle | null;
  domainFocuses: UserDomainFocus[];
  customRoutes: CustomRoute[];
  journeyArchive: JourneyArchiveEntry[];

  // Check-ins
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  todayCustomRouteCheckIns: Record<string, CustomRouteCheckIn>;
  streaks: Partial<Record<DomainType, UserStreak>>;
  // Persisted history for local streak computation and offline recovery.
  // Key: ISO date string. Pruned to 90 days; remote history is fetched from Supabase on bootstrap.
  checkInHistory: Record<string, Partial<Record<DomainType, CheckInStatus>>>;
  customRouteCheckInHistory: Record<string, Record<string, CheckInStatus>>;
  checkInNoteOverrides: Record<string, CheckInNoteOverride>;
  streakProtectionHistory: Record<string, true>;
  awardedWeeklyBonuses: Record<string, true>;

  // Vibe check
  lastVibeCheckDate: string | null;

  // UI
  onboardingComplete: boolean;
  // Set during Day 84 completion to keep the celebration modal visible while
  // the route guard would otherwise redirect to /new-cycle.
  celebrationPending: boolean;
  // Set when XP crosses a level boundary; cleared when user dismisses the card.
  levelUpPending: { level: number; label: string } | null;
  streakProtectionPending: string | null;
  // Seeded from Day 84 reflection; shown on NewCycleScreen to prompt intention.
  nextCycleIntention: string | null;
  // Tracks the last KAIROS phase the user was shown a milestone banner for.
  // null = first load, phase not yet recorded.
  lastCelebrationPhase: string | null;
  profileImageDataUrl: string | null;
  improveCardStatuses: Record<string, NudgeStatus>;
  improveCardSnapshots: Record<string, ImproveCardSnapshot>;
  rewardedImproveCards: Record<string, true>;
  notificationPreferences: NotificationPreferences;
  sharePrivacyPreferences: SharePrivacyPreferences;
  themePreference: ThemePreference;
  offlineSyncStatus: OfflineSyncStatus;
  offlineQueueCount: number;
  offlineSyncLastError: string | null;
}

// ─── Actions Shape ───────────────────────────────────────────────────────────

interface AppActions {
  setAuthUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsBootstrapLoading: (loading: boolean) => void;
  setBootstrapError: (message: string | null) => void;
  setCurrentCycle: (cycle: KairosCycle | null) => void;
  setDomainFocuses: (focuses: UserDomainFocus[]) => void;
  updateDomainFocus: (domainType: DomainType, focusDescription: string) => Promise<void>;

  setDailyCheckIn: (domainType: DomainType, status: CheckInStatus, notes?: string) => Promise<void>;
  updateDailyCheckInNote: (checkIn: DailyCheckIn, notes: string) => Promise<void>;
  setCustomRouteCheckIn: (routeId: string, status: CheckInStatus, notes?: string) => Promise<void>;
  refreshOfflineSyncState: () => Promise<void>;
  flushPendingSync: () => Promise<void>;

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
    reason?: 'invalid' | 'missing-context';
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
  setStreakProtectionPending: (domainLabel: string | null) => void;
  setNextCycleIntention: (intention: string | null) => void;
  setLastCelebrationPhase: (phase: string | null) => void;
  setProfileImageDataUrl: (dataUrl: string | null) => void;
  setNotificationPreferences: (preferences: Partial<NotificationPreferences>) => void;
  setSharePrivacyPreferences: (preferences: Partial<SharePrivacyPreferences>) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setImproveCardStatus: (
    cardId: string,
    status: NudgeStatus,
    xpReward?: number,
    snapshot?: ImproveCardSnapshot,
  ) => Promise<void>;
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
  bootstrapError: null,
  currentCycle: null,
  domainFocuses: [],
  customRoutes: [],
  journeyArchive: [],
  todayCheckIns: {},
  todayCustomRouteCheckIns: {},
  checkInHistory: {},
  customRouteCheckInHistory: {},
  checkInNoteOverrides: {},
  streakProtectionHistory: {},
  awardedWeeklyBonuses: {},
  streaks: {},
  lastVibeCheckDate: null,
  onboardingComplete: false,
  celebrationPending: false,
  levelUpPending: null,
  streakProtectionPending: null,
  nextCycleIntention: null,
  lastCelebrationPhase: null,
  profileImageDataUrl: null,
  improveCardStatuses: {},
  improveCardSnapshots: {},
  rewardedImproveCards: {},
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  sharePrivacyPreferences: DEFAULT_SHARE_PRIVACY,
  themePreference: 'dark',
  offlineSyncStatus: 'idle',
  offlineQueueCount: 0,
  offlineSyncLastError: null,
};

function getAccountScopedInitialState(): Partial<AppState> {
  return {
    profile: null,
    currentCycle: null,
    domainFocuses: [],
    customRoutes: [],
    journeyArchive: [],
    todayCheckIns: {},
    todayCustomRouteCheckIns: {},
    checkInHistory: {},
    customRouteCheckInHistory: {},
    checkInNoteOverrides: {},
    streakProtectionHistory: {},
    awardedWeeklyBonuses: {},
    streaks: {},
    lastVibeCheckDate: null,
    onboardingComplete: false,
    celebrationPending: false,
    levelUpPending: null,
    streakProtectionPending: null,
    nextCycleIntention: null,
    lastCelebrationPhase: null,
    profileImageDataUrl: null,
    improveCardStatuses: {},
    improveCardSnapshots: {},
    rewardedImproveCards: {},
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    sharePrivacyPreferences: DEFAULT_SHARE_PRIVACY,
    offlineSyncStatus: 'idle',
    offlineQueueCount: 0,
    offlineSyncLastError: null,
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuthUser: (authUser) =>
        set((state) => {
          const nextAccountId = authUser?.id ?? null;
          const currentAccountId = state.authUser?.id ?? state.profile?.id ?? null;
          const accountChanged = currentAccountId !== nextAccountId;
          const authSessionChanged = state.authUser?.id !== nextAccountId;

          return {
            ...(accountChanged ? getAccountScopedInitialState() : {}),
            authUser,
            isAuthLoading: false,
            isBootstrapLoading: nextAccountId
              ? authSessionChanged || state.isBootstrapLoading
              : false,
            bootstrapError: null,
          };
        }),
      setProfile: (profile) => set({ profile }),
      setIsBootstrapLoading: (isBootstrapLoading) => set({ isBootstrapLoading }),
      setBootstrapError: (bootstrapError) => set({ bootstrapError }),
      setCurrentCycle: (currentCycle) => set({ currentCycle }),
      setDomainFocuses: (domainFocuses) => set({ domainFocuses }),
      refreshOfflineSyncState: async () => {
        try {
          const count = await getPendingOfflineMutationCount();
          set({
            offlineQueueCount: count,
            offlineSyncStatus: count > 0 ? 'pending' : 'idle',
            offlineSyncLastError: null,
          });
        } catch (error) {
          set({
            offlineSyncStatus: 'degraded',
            offlineSyncLastError:
              error instanceof Error ? error.message : 'Offline storage is unavailable.',
          });
        }
      },
      flushPendingSync: async () => {
        if (isBrowserOffline()) {
          await get().refreshOfflineSyncState();
          return;
        }

        let pending: OfflineMutation[];
        try {
          pending = await listPendingOfflineMutations();
        } catch (error) {
          set({
            offlineSyncStatus: 'degraded',
            offlineSyncLastError:
              error instanceof Error ? error.message : 'Offline storage is unavailable.',
          });
          return;
        }

        if (pending.length === 0) {
          set({ offlineQueueCount: 0, offlineSyncStatus: 'idle', offlineSyncLastError: null });
          return;
        }

        set({ offlineSyncStatus: 'syncing', offlineQueueCount: pending.length });

        for (const mutation of pending) {
          try {
            await syncOfflineMutation(mutation);
            await deleteOfflineMutation(mutation.id);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Sync failed.';
            await markOfflineMutationFailed(mutation.id, message);
            const count = await getPendingOfflineMutationCount();
            set({
              offlineQueueCount: count,
              offlineSyncStatus: 'error',
              offlineSyncLastError: message,
            });
            return;
          }
        }

        set({ offlineQueueCount: 0, offlineSyncStatus: 'idle', offlineSyncLastError: null });
      },
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

        if (!hasBrotherhoodAccess(profile.tier) || currentCycle.id === DEV_CYCLE_ID) return;

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
        const appAccess = hasBrotherhoodAccess(profile.tier);
        const previousStatus = todayCheckIns[domainType]?.status;
        let nextStatus = status;
        let protectionApplied = false;
        let weeklyBonusAwardedNow = false;

        if (appAccess && status === 'Missed') {
          const protectionKey = `${domainType}-${getFortnightBlockKey(today)}`;
          if (!get().streakProtectionHistory[protectionKey]) {
            nextStatus = 'Protected';
            protectionApplied = true;
          }
        }

        const xpDelta =
          getXpForCheckInStatus(nextStatus, appAccess) -
          getXpForCheckInStatus(previousStatus, appAccess);

        // Optimistic update
        const optimisticCheckIn: DailyCheckIn = {
          id: crypto.randomUUID(),
          userId: profile.id,
          cycleId: currentCycle.id,
          date: today,
          domainType,
          status: nextStatus,
          notes: notes ?? null,
          xpAwarded: xpDelta,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          // Update history (keep 90 days)
          const history = { ...state.checkInHistory };
          history[today] = { ...(history[today] ?? {}), [domainType]: nextStatus };
          const cutoff = toLocalIsoDate(new Date(Date.now() - 90 * 86_400_000));
          for (const date of Object.keys(history)) {
            if (date < cutoff) delete history[date];
          }

          const weekDates = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(`${today}T00:00:00`);
            date.setDate(date.getDate() - ((date.getDay() || 7) - 1) + index);
            return toLocalIsoDate(date);
          });
          const weekKey = getWeekKey(today);
          const awardWeeklyBonus = shouldAwardWeeklyBonus({
            weekDates,
            history,
            active: appAccess,
            alreadyAwarded: !!state.awardedWeeklyBonuses[weekKey],
          });
          weeklyBonusAwardedNow = awardWeeklyBonus;
          const totalXpDelta = xpDelta + (awardWeeklyBonus ? XP_PER_WEEK_COMPLETE : 0);
          const protectionKey = `${domainType}-${getFortnightBlockKey(today)}`;

          const { currentStreak, longestStreak } = computeLocalStreak(history, domainType, today);

          const updatedStreak: UserStreak = {
            userId: state.profile?.id ?? '',
            domainType,
            currentStreak,
            longestStreak,
            lastCheckInDate: today,
          };

          const oldXp = state.profile?.xp ?? 0;
          const newXp = Math.max(0, oldXp + totalXpDelta);
          const oldLevel = getLevelForXp(oldXp);
          const newLevel = getLevelForXp(newXp);

          return {
            todayCheckIns: { ...state.todayCheckIns, [domainType]: optimisticCheckIn },
            checkInHistory: history,
            streaks: { ...state.streaks, [domainType]: updatedStreak },
            currentCycle: state.currentCycle
              ? {
                  ...state.currentCycle,
                  totalXpEarned: Math.max(0, state.currentCycle.totalXpEarned + totalXpDelta),
                }
              : null,
            profile: state.profile ? { ...state.profile, xp: newXp } : null,
            streakProtectionHistory: protectionApplied
              ? { ...state.streakProtectionHistory, [protectionKey]: true }
              : state.streakProtectionHistory,
            awardedWeeklyBonuses: awardWeeklyBonus
              ? { ...state.awardedWeeklyBonuses, [weekKey]: true }
              : state.awardedWeeklyBonuses,
            levelUpPending:
              newLevel.level > oldLevel.level
                ? { level: newLevel.level, label: newLevel.label }
                : state.levelUpPending,
            streakProtectionPending: protectionApplied ? domainType : state.streakProtectionPending,
          };
        });

        if (!hasBrotherhoodAccess(profile.tier) || currentCycle.id === DEV_CYCLE_ID) return;

        const mutation: OfflineMutation<DailyCheckInMutationPayload> = {
          id: crypto.randomUUID(),
          type: 'daily_check_in',
          userId: profile.id,
          cycleId: currentCycle.id,
          payload: {
            id: optimisticCheckIn.id,
            date: today,
            domainType,
            status: nextStatus,
            notes: notes ?? null,
            xpDelta,
            totalSyncDelta: xpDelta + (weeklyBonusAwardedNow ? XP_PER_WEEK_COMPLETE : 0),
            updatedAt: optimisticCheckIn.updatedAt,
          },
          createdAt: optimisticCheckIn.updatedAt,
          updatedAt: optimisticCheckIn.updatedAt,
          attemptCount: 0,
          status: 'pending',
        };

        if (isBrowserOffline()) {
          try {
            await enqueueOfflineMutation(mutation);
            await get().refreshOfflineSyncState();
          } catch (error) {
            set({
              offlineSyncStatus: 'degraded',
              offlineSyncLastError:
                error instanceof Error ? error.message : 'Offline storage is unavailable.',
            });
          }
          return;
        }

        try {
          await syncOfflineMutation(mutation);
          await get().refreshOfflineSyncState();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Check-in sync failed.';
          console.error('Check-in sync failed:', message);
          try {
            await enqueueOfflineMutation(mutation);
            await get().refreshOfflineSyncState();
          } catch (storageError) {
            set({
              offlineSyncStatus: 'degraded',
              offlineSyncLastError:
                storageError instanceof Error
                  ? storageError.message
                  : 'Offline storage is unavailable.',
            });
          }
        }
      },
      updateDailyCheckInNote: async (checkIn, notes) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return;

        const now = new Date().toISOString();
        const cleanNotes = notes.trim() || null;
        set((state) => {
          const todayMatch = state.todayCheckIns[checkIn.domainType]?.id === checkIn.id;
          return {
            todayCheckIns: todayMatch
              ? {
                  ...state.todayCheckIns,
                  [checkIn.domainType]: {
                    ...state.todayCheckIns[checkIn.domainType],
                    notes: cleanNotes,
                    updatedAt: now,
                  } as DailyCheckIn,
                }
              : state.todayCheckIns,
            checkInNoteOverrides: {
              ...state.checkInNoteOverrides,
              [checkIn.id]: {
                checkInId: checkIn.id,
                domainType: checkIn.domainType,
                date: checkIn.date,
                notes: cleanNotes,
                updatedAt: now,
              },
            },
          };
        });

        if (!hasBrotherhoodAccess(profile.tier) || currentCycle.id === DEV_CYCLE_ID) return;

        const mutation: OfflineMutation<DailyCheckInNoteMutationPayload> = {
          id: crypto.randomUUID(),
          type: 'daily_check_in_note',
          userId: profile.id,
          cycleId: currentCycle.id,
          payload: { checkInId: checkIn.id, notes: cleanNotes, updatedAt: now },
          createdAt: now,
          updatedAt: now,
          attemptCount: 0,
          status: 'pending',
        };

        if (isBrowserOffline()) {
          try {
            await enqueueOfflineMutation(mutation);
            await get().refreshOfflineSyncState();
          } catch (error) {
            set({
              offlineSyncStatus: 'degraded',
              offlineSyncLastError:
                error instanceof Error ? error.message : 'Offline storage is unavailable.',
            });
          }
          return;
        }

        try {
          await syncOfflineMutation(mutation);
          await get().refreshOfflineSyncState();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Note sync failed.';
          console.error('Note sync failed:', message);
          try {
            await enqueueOfflineMutation(mutation);
            await get().refreshOfflineSyncState();
          } catch (storageError) {
            set({
              offlineSyncStatus: 'degraded',
              offlineSyncLastError:
                storageError instanceof Error
                  ? storageError.message
                  : 'Offline storage is unavailable.',
            });
          }
        }
      },

      addCustomRoute: async ({ parentDomainType, label, description, focusDescription }) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return { ok: false, reason: 'missing-context' };

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
          console.error(
            'Custom route remote sync failed; kept locally:',
            error?.message ?? 'No row returned',
          );
          return { ok: true };
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
        const appAccess = hasBrotherhoodAccess(profile.tier);
        const previous = todayCustomRouteCheckIns[routeId];
        const previousStatus = previous?.date === today ? previous.status : undefined;
        const xpDelta =
          getXpForCheckInStatus(status, appAccess) -
          getXpForCheckInStatus(previousStatus, appAccess);
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

        const mutation: OfflineMutation<CustomRouteCheckInMutationPayload> = {
          id: crypto.randomUUID(),
          type: 'custom_route_check_in',
          userId: profile.id,
          cycleId: currentCycle.id,
          payload: {
            id: checkIn.id,
            routeId,
            date: today,
            status,
            notes: notes ?? null,
            xpDelta,
            updatedAt: now,
          },
          createdAt: now,
          updatedAt: now,
          attemptCount: 0,
          status: 'pending',
        };

        if (isBrowserOffline()) {
          try {
            await enqueueOfflineMutation(mutation);
            await get().refreshOfflineSyncState();
          } catch (error) {
            set({
              offlineSyncStatus: 'degraded',
              offlineSyncLastError:
                error instanceof Error ? error.message : 'Offline storage is unavailable.',
            });
          }
          return;
        }

        try {
          await syncOfflineMutation(mutation);
          await get().refreshOfflineSyncState();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Custom route check-in sync failed.';
          console.error('Custom route check-in sync failed:', message);
          try {
            await enqueueOfflineMutation(mutation);
            await get().refreshOfflineSyncState();
          } catch (storageError) {
            set({
              offlineSyncStatus: 'degraded',
              offlineSyncLastError:
                storageError instanceof Error
                  ? storageError.message
                  : 'Offline storage is unavailable.',
            });
          }
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
            streakProtectionHistory: state.streakProtectionHistory,
            awardedWeeklyBonuses: state.awardedWeeklyBonuses,
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
      setStreakProtectionPending: (streakProtectionPending) => set({ streakProtectionPending }),
      setNextCycleIntention: (nextCycleIntention) => set({ nextCycleIntention }),
      setLastCelebrationPhase: (lastCelebrationPhase) => set({ lastCelebrationPhase }),
      setProfileImageDataUrl: (profileImageDataUrl) => set({ profileImageDataUrl }),
      setNotificationPreferences: (preferences) =>
        set((state) => ({
          notificationPreferences: normaliseNotificationPreferences({
            ...state.notificationPreferences,
            ...preferences,
          }),
        })),
      setSharePrivacyPreferences: (preferences) =>
        set((state) => ({
          sharePrivacyPreferences: { ...state.sharePrivacyPreferences, ...preferences },
        })),
      setThemePreference: (themePreference) =>
        set({ themePreference: normaliseThemePreference(themePreference) }),
      setImproveCardStatus: async (cardId, status, xpReward, snapshot) => {
        const reward = xpReward ?? 0;
        let shouldSyncXp = false;
        let userId: string | null = null;

        set((state) => {
          const shouldAward =
            status === 'completed' && reward > 0 && !state.rewardedImproveCards[cardId];
          const oldXp = state.profile?.xp ?? 0;
          const newXp = shouldAward ? oldXp + reward : oldXp;
          const oldLevel = getLevelForXp(oldXp);
          const newLevel = getLevelForXp(newXp);
          shouldSyncXp =
            shouldAward &&
            !!state.profile &&
            hasBrotherhoodAccess(state.profile.tier) &&
            state.currentCycle?.id !== DEV_CYCLE_ID;
          userId = state.profile?.id ?? null;

          return {
            improveCardStatuses: {
              ...state.improveCardStatuses,
              [cardId]: status,
            },
            improveCardSnapshots: snapshot
              ? { ...state.improveCardSnapshots, [cardId]: snapshot }
              : state.improveCardSnapshots,
            rewardedImproveCards: shouldAward
              ? { ...state.rewardedImproveCards, [cardId]: true }
              : state.rewardedImproveCards,
            profile: state.profile && shouldAward ? { ...state.profile, xp: newXp } : state.profile,
            levelUpPending:
              shouldAward && newLevel.level > oldLevel.level
                ? { level: newLevel.level, label: newLevel.label }
                : state.levelUpPending,
          };
        });

        if (shouldSyncXp && userId) {
          await supabase.rpc('increment_profile_xp', { p_user_id: userId, p_delta: reward });
        }
      },

      submitVibeCheck: async (rating) => {
        const { profile, currentCycle } = get();
        if (!profile || !currentCycle) return;

        const today = toLocalIsoDate(new Date());
        set({ lastVibeCheckDate: today });

        if (!hasBrotherhoodAccess(profile.tier) || currentCycle.id === DEV_CYCLE_ID) return;

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
          checkInNoteOverrides: {},
          domainFocuses: [],
          customRoutes: [],
          streaks: {},
          nextCycleIntention: null,
          improveCardStatuses: {},
          improveCardSnapshots: {},
          rewardedImproveCards: {},
          streakProtectionHistory: {},
          awardedWeeklyBonuses: {},
          offlineSyncStatus: 'idle',
          offlineQueueCount: 0,
          offlineSyncLastError: null,
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
      version: 1,
      migrate: (persistedState): Partial<AppState> => {
        const persisted = persistedState as Partial<AppState>;
        return {
          ...persisted,
          journeyArchive: [],
          notificationPreferences: normaliseNotificationPreferences(
            persisted.notificationPreferences,
          ),
          themePreference: normaliseThemePreference(persisted.themePreference),
        };
      },
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        todayCheckIns: state.todayCheckIns,
        todayCustomRouteCheckIns: state.todayCustomRouteCheckIns,
        checkInHistory: state.checkInHistory,
        customRouteCheckInHistory: state.customRouteCheckInHistory,
        checkInNoteOverrides: state.checkInNoteOverrides,
        streaks: state.streaks,
        profile: state.profile,
        currentCycle: state.currentCycle,
        domainFocuses: state.domainFocuses,
        customRoutes: state.customRoutes,
        lastVibeCheckDate: state.lastVibeCheckDate,
        nextCycleIntention: state.nextCycleIntention,
        lastCelebrationPhase: state.lastCelebrationPhase,
        profileImageDataUrl: state.profileImageDataUrl,
        improveCardStatuses: state.improveCardStatuses,
        improveCardSnapshots: state.improveCardSnapshots,
        rewardedImproveCards: state.rewardedImproveCards,
        notificationPreferences: state.notificationPreferences,
        sharePrivacyPreferences: state.sharePrivacyPreferences,
        themePreference: state.themePreference,
        streakProtectionHistory: state.streakProtectionHistory,
        awardedWeeklyBonuses: state.awardedWeeklyBonuses,
        offlineSyncStatus: state.offlineSyncStatus,
        offlineQueueCount: state.offlineQueueCount,
        offlineSyncLastError: state.offlineSyncLastError,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        return {
          ...currentState,
          ...persisted,
          journeyArchive: persisted.journeyArchive ?? currentState.journeyArchive,
          notificationPreferences: normaliseNotificationPreferences(
            persisted.notificationPreferences,
          ),
          themePreference: normaliseThemePreference(persisted.themePreference),
        };
      },
    },
  ),
);
