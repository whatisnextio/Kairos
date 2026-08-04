import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DailyCheckIn, DomainType, KairosCycle, Profile, UserDomainFocus } from '@/types';
import { getAvailableDomains } from '@/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const DEV_EMAIL = 'ldgmcdowell@gmail.com';
const DEV_USER_ID = 'local-dev-liam';
const DEV_CYCLE_ID = 'local-dev-cycle';

export default function LoginPage() {
  const {
    setAuthUser,
    setProfile,
    setCurrentCycle,
    setDomainFocuses,
    setTodayCheckIns,
    mergeCheckInHistory,
    setOnboardingComplete,
  } = useAppStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const showDevLogin =
    import.meta.env.DEV && ['127.0.0.1', 'localhost'].includes(window.location.hostname);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  const handleDevLogin = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const domains = getAvailableDomains(DEV_EMAIL);
    const focuses: UserDomainFocus[] = domains.map((domain) => ({
      id: `local-focus-${domain.type.toLowerCase()}`,
      userId: DEV_USER_ID,
      cycleId: DEV_CYCLE_ID,
      domainType: domain.type,
      focusDescription: domain.focusOptions[0],
      setAt: now,
    }));

    const checkIns = domains
      .slice(0, 2)
      .reduce<Partial<Record<DomainType, DailyCheckIn>>>((acc, domain, index) => {
        acc[domain.type] = {
          id: `local-checkin-${domain.type.toLowerCase()}`,
          userId: DEV_USER_ID,
          cycleId: DEV_CYCLE_ID,
          date: today,
          domainType: domain.type,
          status: index === 0 ? 'Done' : 'Partial',
          notes: null,
          xpAwarded: index === 0 ? 10 : 5,
          createdAt: now,
          updatedAt: now,
        };
        return acc;
      }, {});

    const profile: Profile = {
      id: DEV_USER_ID,
      displayName: 'Liam',
      identityAnchorId: 'builder',
      tier: 'brotherhood',
      xp: 125,
      currentKairosCycleId: DEV_CYCLE_ID,
      dateOfBirth: '1984-01-01',
      squadId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    };

    const cycle: KairosCycle = {
      id: DEV_CYCLE_ID,
      userId: DEV_USER_ID,
      startDate: today,
      endDate: null,
      status: 'active',
      totalXpEarned: 125,
      completionPercentage: 0,
      createdAt: now,
    };

    setAuthUser({ id: DEV_USER_ID, email: DEV_EMAIL });
    setProfile(profile);
    setCurrentCycle(cycle);
    setDomainFocuses(focuses);
    setTodayCheckIns(checkIns);
    mergeCheckInHistory({
      [today]: Object.fromEntries(domains.map((domain) => [domain.type, 'Pending'])),
    });
    setOnboardingComplete(true);
  };

  return (
    <div className="min-h-screen bg-base-black flex flex-col items-center justify-center px-6 py-12">
      <img src="/kairos-12k-logo.svg" alt="Kairos 12K" className="w-48 mb-4" draggable={false} />
      <p className="text-base-text font-heading font-bold text-lg tracking-wide mb-1">
        12 weeks. Four domains. Daily proof.
      </p>
      <p className="text-base-subtext text-sm text-center max-w-xs mb-10">
        Build body, fuel, mind, and connection through small actions that repeat.
      </p>

      {sent ? (
        <div className="text-center">
          <p className="text-base-text font-medium mb-2">Check your email.</p>
          <p className="text-base-subtext text-sm">Magic link sent to {email}.</p>
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="w-full max-w-sm flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={error}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send magic link'}
          </Button>
          <p className="text-center text-base-subtext text-xs">
            No account yet?{' '}
            <Link to="/register" className="text-accent-green hover:underline">
              Sign up
            </Link>
          </p>
          {showDevLogin && (
            <Button type="button" variant="ghost" onClick={handleDevLogin} className="w-full">
              Use local Liam test account
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
