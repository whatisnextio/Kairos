import { readFileSync } from 'node:fs';
import type { KairosCycle, Profile, UserDomainFocus } from '@/types';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const profile: Profile = {
  id: 'user-1',
  displayName: 'Liam',
  identityAnchorId: 'provider',
  tier: 'brotherhood',
  xp: 120,
  currentKairosCycleId: 'cycle-1',
  dateOfBirth: '1984-01-01',
  squadId: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const cycle: KairosCycle = {
  id: 'cycle-1',
  userId: 'user-1',
  startDate: '2026-08-01',
  endDate: null,
  status: 'active',
  totalXpEarned: 80,
  completionPercentage: 0,
  createdAt: '2026-08-01T00:00:00Z',
};

const focus: UserDomainFocus = {
  id: 'focus-1',
  userId: 'user-1',
  cycleId: 'cycle-1',
  domainType: 'BODY',
  focusDescription: 'Walk for 20 minutes',
  setAt: '2026-08-01T00:00:00Z',
};

describe('onboarding and reset contract', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      configurable: true,
    });
  });

  it('explains the framework before the setup screens', () => {
    const source = readFileSync('src/pages/onboarding/OnboardingFlow.tsx', 'utf8');

    expect(source).toContain(
      "type Step = 'framework' | 'identity' | 'focus' | 'accountability' | 'commit';",
    );
    expect(source).toContain(
      "const ONBOARDING_STEPS: Step[] = ['framework', 'identity', 'focus', 'accountability', 'commit'];",
    );
    expect(source).toContain('{stepNumber} of {stepCount}');
    expect(source).toContain('Start your 12K plan.');
    expect(source).toContain('Set up your four starter actions now.');
    expect(source).toContain('Nothing is marked Done until you actually do');
    expect(source).toContain('Choose your four actions.');
    expect(source).toContain('Pick one simple starter action in each area.');
    expect(source).toMatch(/They are not\s+marked Done yet\./);
    expect(source).toContain('Choose reminder level.');
    expect(source).toContain('Your four actions are set.');
    expect(source).toContain('mark it Done');
    expect(source).toContain('setNotificationPreferences');
    expect(source).not.toMatch(/cure|fixed guaranteed outcome|medical claim/i);
  });

  it('recovers a returning user when the profile is missing its active cycle link', () => {
    const source = readFileSync('src/hooks/useBootstrap.ts', 'utf8');

    expect(source).toContain(".from('kairos_cycles')");
    expect(source).toContain(".eq('status', 'active')");
    expect(source).toContain('.update({ current_kairos_cycle_id: cycleId })');
    expect(source).toContain('setOnboardingComplete(false)');
    expect(source).toContain('setOnboardingComplete(true)');
  });

  it('keeps onboarding navigable and visibly recoverable during final setup', () => {
    const source = readFileSync('src/pages/onboarding/OnboardingFlow.tsx', 'utf8');

    expect(source).toContain('const goToFramework = () =>');
    expect(source).toContain("setStep('framework')");
    expect(source).toContain('animate-spin');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('Starting...');
    expect(source).toContain('role="alert"');
    expect(source).toContain('submitInFlight.current = false');
    expect(source).toContain('setSubmitting(false)');
  });

  it('clears journey metrics when a user resets their journey', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({
      profile,
      currentCycle: cycle,
      domainFocuses: [focus],
      checkInHistory: { '2026-08-04': { BODY: 'Done' } },
      todayCheckIns: {},
      todayCustomRouteCheckIns: {},
      customRouteCheckInHistory: {},
      customRoutes: [],
      journeyArchive: [
        {
          id: 'archive-1',
          archivedAt: '2026-08-03T00:00:00Z',
          reason: 'abandoned',
          cycleId: 'cycle-0',
          startDate: '2026-08-01',
          endDate: '2026-08-03',
          xp: 50,
          domainFocuses: [],
          customRoutes: [],
          checkInHistory: {},
          customRouteCheckInHistory: {},
        },
      ],
      streaks: {
        BODY: {
          userId: 'user-1',
          domainType: 'BODY',
          currentStreak: 2,
          longestStreak: 2,
          lastCheckInDate: '2026-08-04',
        },
      },
      streakProtectionHistory: { 'BODY-2026-08-04': true },
      awardedWeeklyBonuses: { '2026-W32': true },
      lastVibeCheckDate: '2026-08-04',
      levelUpPending: { level: 2, label: 'Level 2' },
      onboardingComplete: true,
    });

    useAppStore.getState().resetJourneyMetricsLocalState();

    const state = useAppStore.getState();
    expect(state.currentCycle).toBeNull();
    expect(state.onboardingComplete).toBe(false);
    expect(state.profile?.xp).toBe(0);
    expect(state.profile?.currentKairosCycleId).toBeNull();
    expect(state.domainFocuses).toEqual([]);
    expect(state.checkInHistory).toEqual({});
    expect(state.todayCheckIns).toEqual({});
    expect(state.streaks).toEqual({});
    expect(state.streakProtectionHistory).toEqual({});
    expect(state.awardedWeeklyBonuses).toEqual({});
    expect(state.lastVibeCheckDate).toBeNull();
    expect(state.levelUpPending).toBeNull();
    expect(state.journeyArchive).toEqual([]);
  });

  it('resets all journey metrics through a trusted database function when a journey is abandoned', () => {
    const modal = readFileSync('src/components/modals/AbandonCycleModal.tsx', 'utf8');
    const migration = readFileSync('supabase/migrations/033_reset_journey_metrics.sql', 'utf8');

    expect(modal).toContain("supabase.rpc('reset_journey_metrics')");
    expect(modal).toContain('resetJourneyMetricsLocalState');
    expect(modal).not.toContain('archiveCurrentJourney');
    expect(modal).toContain('Your active journey, points, streaks, check-ins, and');
    expect(modal).toContain('local history reset');
    expect(migration).toContain('create or replace function public.reset_journey_metrics()');
    expect(migration).toContain('xp = 0');
    expect(migration).toContain('current_kairos_cycle_id = null');
    expect(migration).toContain('delete from public.kairos_cycles');
    expect(migration).toContain('delete from public.user_streaks');
  });

  it('starts a new cycle only after archiving the previous local journey', () => {
    const source = readFileSync('src/pages/NewCycleScreen.tsx', 'utf8');
    const archiveIndex = source.indexOf("archiveCurrentJourney('completed')");
    const setCycleIndex = source.indexOf('setCurrentCycle({');
    const resetIndex = source.indexOf('resetCycleLocalState();');

    expect(archiveIndex).toBeGreaterThan(-1);
    expect(setCycleIndex).toBeGreaterThan(-1);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(archiveIndex).toBeLessThan(setCycleIndex);
    expect(archiveIndex).toBeLessThan(resetIndex);
  });
});
