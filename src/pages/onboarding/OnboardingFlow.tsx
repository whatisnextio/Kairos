import Button from '@/components/common/Button';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DailyCheckIn, DomainType, IdentityAnchorId, Profile } from '@/types';
import {
  IDENTITY_ANCHORS,
  PRODUCT_POSITIONING,
  XP_PER_CHECK_IN_DONE,
  getAvailableDomains,
} from '@/types';
import { getComplimentaryProfileFields } from '@/utils/entitlements';
import { DEV_CYCLE_ID, isLocalDevUser } from '@/utils/localDevSession';
import { useRef, useState } from 'react';

type Step = 'identity' | 'focus' | 'commit';
const ONBOARDING_STEPS: Step[] = ['identity', 'focus', 'commit'];

export default function OnboardingFlow() {
  const {
    authUser,
    profile,
    currentCycle,
    setProfile,
    setCurrentCycle,
    setDomainFocuses,
    setOnboardingComplete,
    setTodayCheckIns,
    mergeCheckInHistory,
  } = useAppStore();

  const [step, setStep] = useState<Step>('identity');
  const [anchorId, setAnchorId] = useState<IdentityAnchorId | null>(
    profile?.identityAnchorId ?? null,
  );
  const [customAnchor, setCustomAnchor] = useState(profile?.customAnchorName ?? '');
  const [domain, setDomain] = useState<DomainType | null>(null);
  const [microAction, setMicroAction] = useState('');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  const availableDomains = getAvailableDomains(authUser?.email);
  const selectedDomain = availableDomains.find((d) => d.type === domain);
  const stepNumber = ONBOARDING_STEPS.indexOf(step) + 1;

  const goToFocus = () => {
    setSubmitError(null);
    setStep('focus');
  };

  const goToCommit = () => {
    setSubmitError(null);
    setStep('commit');
  };

  const completeLocally = ({
    today,
    now,
    xpAfterWin,
  }: {
    today: string;
    now: string;
    xpAfterWin: number;
  }) => {
    if (!authUser || !anchorId || !domain) return;

    const ci: DailyCheckIn = {
      id: `local-checkin-${domain.toLowerCase()}`,
      userId: authUser.id,
      cycleId: DEV_CYCLE_ID,
      date: today,
      domainType: domain,
      status: 'Done',
      notes: null,
      xpAwarded: XP_PER_CHECK_IN_DONE,
      createdAt: now,
      updatedAt: now,
    };

    setProfile({
      id: authUser.id,
      displayName: displayName.trim() || 'Liam',
      identityAnchorId: anchorId,
      customAnchorName: anchorId === 'custom' ? customAnchor.trim() : undefined,
      tier: 'brotherhood',
      xp: xpAfterWin,
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
    });
    setCurrentCycle({
      id: DEV_CYCLE_ID,
      userId: authUser.id,
      startDate: today,
      endDate: null,
      status: 'active',
      totalXpEarned: XP_PER_CHECK_IN_DONE,
      completionPercentage: 0,
      createdAt: now,
    });
    setDomainFocuses([
      {
        id: `local-focus-${domain.toLowerCase()}`,
        userId: authUser.id,
        cycleId: DEV_CYCLE_ID,
        domainType: domain,
        focusDescription: microAction.trim(),
        setAt: now,
      },
    ]);
    setTodayCheckIns({ [domain]: ci });
    mergeCheckInHistory({ [today]: { [domain]: 'Done' } });
    setOnboardingComplete(true);
  };

  const handleCommit = async () => {
    if (submitInFlight.current || !authUser || !anchorId || !domain || !microAction.trim()) return;
    submitInFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const complimentaryFields = getComplimentaryProfileFields(authUser.email);
    const isPaidOnboarding = isLocalDevUser(authUser.id) || 'tier' in complimentaryFields;
    const firstProofXp = isPaidOnboarding ? XP_PER_CHECK_IN_DONE : 0;
    const xpAfterWin = (profile?.xp ?? 0) + firstProofXp;

    try {
      if (currentCycle?.status === 'active' || profile?.currentKairosCycleId) {
        setOnboardingComplete(true);
        return;
      }

      if (isLocalDevUser(authUser.id)) {
        completeLocally({ today, now, xpAfterWin });
        return;
      }

      const {
        data: { user: fullUser },
      } = await supabase.auth.getUser();
      const dobFromAuth: string = fullUser?.user_metadata?.date_of_birth ?? today;
      const cleanName = displayName.trim() || 'Anonymous';
      const cleanCustomAnchor = anchorId === 'custom' ? customAnchor.trim() : null;
      const cleanAction = microAction.trim();

      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          display_name: cleanName,
          identity_anchor_id: anchorId,
          custom_anchor_name: cleanCustomAnchor,
          tier: 'free',
          xp: xpAfterWin,
          date_of_birth: dobFromAuth,
          ...complimentaryFields,
        })
        .select()
        .single();

      if (profileErr || !profileRow) {
        throw new Error(profileErr?.message ?? 'Setup failed. Check your connection.');
      }

      const { data: cycle, error: cycleErr } = await supabase
        .from('kairos_cycles')
        .insert({ user_id: authUser.id, start_date: today, status: 'active' })
        .select()
        .single();

      if (cycleErr || !cycle) {
        throw new Error(cycleErr?.message ?? 'Could not create your cycle. Try again.');
      }

      const { data: focus, error: focusErr } = await supabase
        .from('user_domain_focuses')
        .insert({
          user_id: authUser.id,
          cycle_id: cycle.id,
          domain_type: domain,
          focus_description: cleanAction,
        })
        .select()
        .single();

      if (focusErr || !focus) {
        throw new Error(focusErr?.message ?? 'Could not save your starting focus.');
      }

      const { data: checkInRow, error: checkInErr } = await supabase
        .from('daily_check_ins')
        .insert({
          user_id: authUser.id,
          cycle_id: cycle.id,
          date: today,
          domain_type: domain,
          status: 'Done',
          xp_awarded: firstProofXp,
        })
        .select()
        .single();

      if (checkInErr || !checkInRow) {
        throw new Error(checkInErr?.message ?? 'Could not save your first action.');
      }

      const { error: linkErr } = await supabase
        .from('profiles')
        .update({ current_kairos_cycle_id: cycle.id })
        .eq('id', authUser.id);

      if (linkErr) {
        throw new Error('Setup failed. Please try again.');
      }

      const ci: DailyCheckIn = {
        id: checkInRow.id,
        userId: authUser.id,
        cycleId: cycle.id,
        date: today,
        domainType: domain,
        status: 'Done',
        notes: null,
        xpAwarded: firstProofXp,
        createdAt: checkInRow.created_at,
        updatedAt: checkInRow.updated_at,
      };

      setProfile({
        id: authUser.id,
        displayName: cleanName,
        identityAnchorId: anchorId,
        customAnchorName: cleanCustomAnchor ?? undefined,
        tier: profileRow.tier as Profile['tier'],
        xp: xpAfterWin,
        currentKairosCycleId: cycle.id,
        dateOfBirth: dobFromAuth,
        squadId: null,
        stripeCustomerId: profileRow.stripe_customer_id as string | null,
        stripeSubscriptionId: profileRow.stripe_subscription_id as string | null,
        subscriptionStatus: profileRow.subscription_status as string | null,
        cancelAtPeriodEnd: (profileRow.cancel_at_period_end as boolean | null) ?? false,
        currentPeriodEnd: profileRow.current_period_end as string | null,
        createdAt: profileRow.created_at,
        updatedAt: profileRow.updated_at,
      });
      setCurrentCycle({
        id: cycle.id,
        userId: authUser.id,
        startDate: today,
        endDate: null,
        status: 'active',
        totalXpEarned: firstProofXp,
        completionPercentage: 0,
        createdAt: cycle.created_at,
      });
      setDomainFocuses([
        {
          id: focus.id,
          userId: authUser.id,
          cycleId: cycle.id,
          domainType: domain,
          focusDescription: cleanAction,
          setAt: focus.set_at,
        },
      ]);
      setTodayCheckIns({ [domain]: ci });
      mergeCheckInHistory({ [today]: { [domain]: 'Done' } });
      setOnboardingComplete(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-black px-4 py-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <p className="font-heading text-xs text-base-muted tracking-widest uppercase">12K</p>
          <p className="text-base-muted text-xs">{stepNumber} of 3</p>
        </div>

        {step === 'identity' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Start your 12-week reset.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              {PRODUCT_POSITIONING.what} It gives you the next move, a daily check-in, and a
              recovery path when the day slips.
            </p>

            <Input
              id="name"
              label="Name"
              placeholder="First name or nickname"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mb-4"
            />

            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
              Identity anchor
            </p>
            <div className="grid grid-cols-1 gap-2">
              {IDENTITY_ANCHORS.map((anchor) => (
                <button
                  type="button"
                  key={anchor.id}
                  onClick={() => setAnchorId(anchor.id)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    anchorId === anchor.id
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-base-border bg-base-surface hover:border-base-muted'
                  }`}
                >
                  <p className="font-heading font-medium text-base-text tracking-wide">
                    {anchor.name}
                  </p>
                  <p className="text-base-subtext text-xs mt-0.5">{anchor.description}</p>
                </button>
              ))}
            </div>
            {anchorId === 'custom' && (
              <input
                className="input-field mt-3"
                placeholder="Name your identity"
                value={customAnchor}
                onChange={(event) => setCustomAnchor(event.target.value)}
              />
            )}

            <Button
              onClick={goToFocus}
              disabled={
                !displayName.trim() || !anchorId || (anchorId === 'custom' && !customAnchor.trim())
              }
              className="w-full mt-5"
            >
              Continue
            </Button>
          </section>
        )}

        {step === 'focus' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Choose the first lever.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              The public framework is Body, Fuel, Self, and Connection. Private routes can be added
              later without changing the system.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {availableDomains.map((d) => (
                <button
                  type="button"
                  key={d.type}
                  onClick={() => {
                    setDomain(d.type);
                    setMicroAction(d.focusOptions[0] ?? '');
                  }}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    domain === d.type
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-base-border bg-base-surface hover:border-base-muted'
                  }`}
                >
                  <p className={`font-heading font-medium tracking-wide ${d.colour}`}>{d.label}</p>
                  <p className="text-base-subtext text-xs mt-1">{d.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="ghost" onClick={() => setStep('identity')} className="flex-1">
                Back
              </Button>
              <Button onClick={goToCommit} disabled={!domain} className="flex-1">
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === 'commit' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Make Day 0 count.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              Pick one action you can complete now for{' '}
              <span className="font-medium text-base-text">{selectedDomain?.label ?? 'today'}</span>
              . This becomes your first focus and your first check-in.
            </p>

            {selectedDomain && (
              <div className="grid grid-cols-1 gap-2 mb-4">
                {selectedDomain.focusOptions.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => setMicroAction(option)}
                    className={`text-left rounded border px-3 py-2 text-sm transition-colors ${
                      microAction === option
                        ? 'border-accent-green bg-accent-green/10 text-base-text'
                        : 'border-base-border bg-base-surface text-base-subtext hover:border-base-muted'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            <textarea
              className="input-field h-24 resize-none text-sm"
              placeholder={selectedDomain?.focusPrompt ?? 'Write your first action.'}
              value={microAction}
              onChange={(event) => setMicroAction(event.target.value)}
            />

            {submitError && (
              <p role="alert" className="text-status-missed text-sm mt-3">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <Button
                variant="ghost"
                onClick={() => setStep('focus')}
                disabled={submitting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCommit}
                disabled={!microAction.trim() || submitting}
                className="flex-1"
              >
                {submitting ? 'Starting...' : 'Done, start 12K'}
              </Button>
            </div>

            <p className="text-base-muted text-xs text-center mt-4">
              Reminders can be enabled later from You.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  className = '',
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-base-subtext font-heading tracking-wider uppercase"
        >
          {label}
        </label>
      )}
      <input id={id} className="input-field" {...props} />
    </div>
  );
}
