import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DailyCheckIn, DomainType, KairosCycle, Profile, UserDomainFocus } from '@/types';
import { XP_PER_CHECK_IN_DONE, getAvailableDomains } from '@/types';
import { AUTH_COPY } from '@/utils/brandCopy';
import {
  DEV_CYCLE_ID,
  DEV_EMAIL,
  DEV_USER_ID,
  isLocalDevHost,
  startLocalDevSession,
} from '@/utils/localDevSession';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
  const showDevLogin = isLocalDevHost();

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
          status: index === 0 ? 'Done' : 'Pending',
          notes: null,
          xpAwarded: index === 0 ? XP_PER_CHECK_IN_DONE : 0,
          createdAt: now,
          updatedAt: now,
        };
        return acc;
      }, {});

    const profile: Profile = {
      id: DEV_USER_ID,
      displayName: 'Liam',
      identityAnchorId: 'builder',
      tier: 'lifechanger',
      xp: XP_PER_CHECK_IN_DONE,
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
      totalXpEarned: XP_PER_CHECK_IN_DONE,
      completionPercentage: 0,
      createdAt: now,
    };

    startLocalDevSession();
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[20px] border border-white/10 bg-base-black/80 px-5 py-7 shadow-[0_32px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:px-7">
        <img
          src="/kairos-12k-logo.svg"
          alt="Kairos 12K"
          width="192"
          height="54"
          className="mb-6 h-auto w-48"
          draggable={false}
        />
        <p className="mb-1 font-heading text-lg font-bold tracking-wide text-base-text">
          {AUTH_COPY.headline}
        </p>
        <p className="mb-8 text-sm leading-relaxed text-base-subtext">{AUTH_COPY.body}</p>

        {sent ? (
          <div>
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
              <Link to="/register" className="text-accent-green underline underline-offset-2">
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
      </section>
    </main>
  );
}
