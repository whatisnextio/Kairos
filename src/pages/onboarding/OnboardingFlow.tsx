import Button from '@/components/common/Button';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DailyCheckIn, DomainType, IdentityAnchorId } from '@/types';
import { DOMAINS, IDENTITY_ANCHORS } from '@/types';
import { useState } from 'react';

type Step = 'welcome' | 'anchor' | 'domain' | 'action' | 'win' | 'celebrate';

export default function OnboardingFlow() {
  const {
    authUser,
    setProfile,
    setCurrentCycle,
    setDomainFocuses,
    setOnboardingComplete,
    setTodayCheckIns,
    mergeCheckInHistory,
  } = useAppStore();

  const [step, setStep] = useState<Step>('welcome');
  const [anchorId, setAnchorId] = useState<IdentityAnchorId | null>(null);
  const [customAnchor, setCustomAnchor] = useState('');
  const [domain, setDomain] = useState<DomainType | null>(null);
  const [microAction, setMicroAction] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleWin = async () => {
    if (!authUser || !anchorId || !domain || !microAction) return;
    setSubmitting(true);
    setSubmitError(null);

    const today = new Date().toISOString().split('T')[0];

    // Prefer the DOB the user provided at registration; fall back to today
    const {
      data: { user: fullUser },
    } = await supabase.auth.getUser();
    const dobFromAuth: string = fullUser?.user_metadata?.date_of_birth ?? today;

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        display_name: displayName || 'Anonymous',
        identity_anchor_id: anchorId,
        custom_anchor_name: anchorId === 'custom' ? customAnchor : null,
        tier: 'free',
        xp: 10,
        date_of_birth: dobFromAuth,
      })
      .select()
      .single();

    if (profileErr || !profile) {
      setSubmitError(profileErr?.message ?? 'Setup failed. Check your connection.');
      setSubmitting(false);
      return;
    }

    const { data: cycle, error: cycleErr } = await supabase
      .from('kairos_cycles')
      .insert({ user_id: authUser.id, start_date: today, status: 'active' })
      .select()
      .single();

    if (cycleErr || !cycle) {
      setSubmitError(cycleErr?.message ?? 'Could not create your cycle. Try again.');
      setSubmitting(false);
      return;
    }

    const { data: focus } = await supabase
      .from('user_domain_focuses')
      .insert({
        user_id: authUser.id,
        cycle_id: cycle.id,
        domain_type: domain,
        focus_description: microAction,
      })
      .select()
      .single();

    const { data: checkInRow } = await supabase
      .from('daily_check_ins')
      .insert({
        user_id: authUser.id,
        cycle_id: cycle.id,
        date: today,
        domain_type: domain,
        status: 'Done',
        xp_awarded: 10,
      })
      .select()
      .single();

    if (checkInRow && domain) {
      const ci: DailyCheckIn = {
        id: checkInRow.id,
        userId: authUser.id,
        cycleId: cycle.id,
        date: today,
        domainType: domain,
        status: 'Done',
        notes: null,
        xpAwarded: 10,
        createdAt: checkInRow.created_at,
        updatedAt: checkInRow.updated_at,
      };
      setTodayCheckIns({ [domain]: ci });
      // Seed checkInHistory so computeLocalStreak counts day 0 from day 1 onwards.
      mergeCheckInHistory({ [today]: { [domain]: 'Done' } });
    }

    const { error: linkErr } = await supabase
      .from('profiles')
      .update({ current_kairos_cycle_id: cycle.id })
      .eq('id', authUser.id);

    if (linkErr) {
      setSubmitError('Setup failed. Please try again.');
      setSubmitting(false);
      return;
    }

    setProfile({
      id: authUser.id,
      displayName: displayName || 'Anonymous',
      identityAnchorId: anchorId,
      customAnchorName: anchorId === 'custom' ? customAnchor : undefined,
      tier: 'free',
      xp: 10,
      currentKairosCycleId: cycle.id,
      dateOfBirth: dobFromAuth,
      squadId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });

    setCurrentCycle({
      id: cycle.id,
      userId: authUser.id,
      startDate: today,
      endDate: null,
      status: 'active',
      totalXpEarned: 10,
      completionPercentage: 0,
      createdAt: cycle.created_at,
    });

    if (focus) {
      setDomainFocuses([
        {
          id: focus.id,
          userId: authUser.id,
          cycleId: cycle.id,
          domainType: domain,
          focusDescription: microAction,
          setAt: focus.set_at,
        },
      ]);
    }

    // Do NOT call setOnboardingComplete here. It would cause App.tsx to switch to the
    // main router immediately, unmounting OnboardingFlow before the celebrate step renders.
    // setOnboardingComplete(true) is called by the celebrate step's CTA button instead.
    setStep('celebrate');
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-base-black flex flex-col items-center justify-center px-6 py-12">
      {step === 'welcome' && (
        <div className="text-center max-w-sm">
          <h1 className="font-heading text-5xl font-bold text-base-text mb-4 tracking-widest">
            12K
          </h1>
          <p className="text-base-subtext mb-2">12 weeks.</p>
          <p className="text-base-subtext mb-2">One transformation.</p>
          <p className="text-base-subtext mb-10">No excuses.</p>
          <Input
            id="name"
            label="What do people call you?"
            placeholder="First name or nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mb-6 text-left"
          />
          <Button
            onClick={() => setStep('anchor')}
            disabled={!displayName.trim()}
            className="w-full"
          >
            Start
          </Button>
        </div>
      )}

      {step === 'anchor' && (
        <div className="w-full max-w-sm">
          <h2 className="font-heading text-2xl font-bold text-base-text mb-2 tracking-wide">
            Who do you want to become?
          </h2>
          <p className="text-base-subtext text-sm mb-6">
            Choose your identity anchor for this cycle.
          </p>
          <div className="flex flex-col gap-3">
            {IDENTITY_ANCHORS.map((anchor) => (
              <button
                type="button"
                key={anchor.id}
                onClick={() => setAnchorId(anchor.id)}
                className={`w-full text-left p-4 rounded border transition-colors ${
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
              onChange={(e) => setCustomAnchor(e.target.value)}
            />
          )}
          <Button
            onClick={() => setStep('domain')}
            disabled={!anchorId || (anchorId === 'custom' && !customAnchor.trim())}
            className="w-full mt-6"
          >
            Lock it in
          </Button>
        </div>
      )}

      {step === 'domain' && (
        <div className="w-full max-w-sm">
          <h2 className="font-heading text-2xl font-bold text-base-text mb-2 tracking-wide">
            Where do you start?
          </h2>
          <p className="text-base-subtext text-sm mb-6">
            Pick one domain. You'll add the others over the next three days.
          </p>
          <div className="flex flex-col gap-3">
            {DOMAINS.map((d) => (
              <button
                type="button"
                key={d.type}
                onClick={() => setDomain(d.type)}
                className={`w-full text-left p-4 rounded border transition-colors ${
                  domain === d.type
                    ? 'border-accent-green bg-accent-green/10'
                    : 'border-base-border bg-base-surface hover:border-base-muted'
                }`}
              >
                <p className={`font-heading font-medium tracking-wide ${d.colour}`}>{d.label}</p>
              </button>
            ))}
          </div>
          <Button onClick={() => setStep('action')} disabled={!domain} className="w-full mt-6">
            Choose
          </Button>
        </div>
      )}

      {step === 'action' && (
        <div className="w-full max-w-sm">
          <h2 className="font-heading text-2xl font-bold text-base-text mb-2 tracking-wide">
            What's today's 5-minute action?
          </h2>
          <p className="text-base-subtext text-sm mb-6">
            The smallest useful thing you can do right now for{' '}
            <span className="text-base-text font-medium">{domain?.toLowerCase()}</span>.
          </p>
          <textarea
            className="input-field h-28 resize-none"
            placeholder="e.g. 10 press-ups. Call my mum. Write one paragraph."
            value={microAction}
            onChange={(e) => setMicroAction(e.target.value)}
          />
          <Button
            onClick={() => setStep('win')}
            disabled={!microAction.trim()}
            className="w-full mt-4"
          >
            Lock it in
          </Button>
        </div>
      )}

      {step === 'win' && !submitting && (
        <div className="w-full max-w-sm">
          <h2 className="font-heading text-2xl font-bold text-base-text mb-2 tracking-wide">
            Do it now. We'll wait.
          </h2>
          <p className="text-base-subtext text-sm mb-6">{microAction}</p>
          <p className="text-base-subtext text-sm mb-10">
            Take 5 minutes. Come back when it's done.
          </p>
          <Button onClick={handleWin} disabled={submitting} className="w-full">
            Done. Day 0 complete.
          </Button>
          {submitError && (
            <p role="alert" className="text-status-missed text-sm mt-4 text-center">
              {submitError}
            </p>
          )}
        </div>
      )}

      {submitting && <p className="text-base-subtext text-sm">Setting up your cycle...</p>}

      {step === 'celebrate' && (
        <div className="w-full max-w-sm text-center">
          <p className="text-accent-green font-heading font-bold text-4xl tracking-wide mb-2">
            +10 XP
          </p>
          <h2 className="font-heading text-2xl font-bold text-base-text mb-2 tracking-wide">
            Day 0 done.
          </h2>
          <p className="text-base-subtext text-sm mb-2">That's how it starts.</p>
          <p className="text-base-subtext text-sm mb-10">
            Day 1 begins tomorrow. Same time. Same commitment.
          </p>
          <Button onClick={() => setOnboardingComplete(true)} className="w-full">
            Go to dashboard
          </Button>
        </div>
      )}
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
