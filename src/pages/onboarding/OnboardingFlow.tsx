import Button from '@/components/common/Button';
import { requestPushPermission } from '@/services/pushNotifications';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DailyCheckIn, DomainType, IdentityAnchorId } from '@/types';
import { DOMAINS, IDENTITY_ANCHORS } from '@/types';
import { useState } from 'react';

type Step = 'welcome' | 'anchor' | 'domain' | 'action' | 'win' | 'celebrate' | 'notifications';

const PROGRESS_STEPS: Step[] = ['welcome', 'anchor', 'domain', 'action', 'win'];

const PREV_STEP: Partial<Record<Step, Step>> = {
  anchor: 'welcome',
  domain: 'anchor',
  action: 'domain',
  win: 'action',
};

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
  const [expandedTooltip, setExpandedTooltip] = useState<IdentityAnchorId | null>(null);
  const [customAnchor, setCustomAnchor] = useState('');
  const [domain, setDomain] = useState<DomainType | null>(null);
  const [microAction, setMicroAction] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const progressIndex = PROGRESS_STEPS.indexOf(step);
  const showProgress = progressIndex >= 0;

  const handleBack = () => {
    const prev = PREV_STEP[step];
    if (prev) setStep(prev);
  };

  const handleWin = async () => {
    if (!authUser || !anchorId || !domain || !microAction) return;
    setSubmitting(true);
    setSubmitError(null);

    const today = new Date().toISOString().split('T')[0];

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

    setStep('celebrate');
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-base-black flex flex-col px-6 py-12">
      {/* Progress dots */}
      {showProgress && (
        <div className="flex justify-center gap-2 mb-8">
          {PROGRESS_STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i < progressIndex
                  ? 'w-6 bg-accent-green'
                  : i === progressIndex
                    ? 'w-6 bg-accent-green'
                    : 'w-3 bg-base-border'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* ── Welcome ─────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <img
              src="/kairos-12k-logo.svg"
              alt="Kairos 12K"
              className="w-48 mb-8"
              draggable={false}
            />
            <h1 className="font-heading text-3xl font-bold text-base-text mb-3 tracking-wide">
              365 days. Eight domains. One man.
            </h1>
            <p className="text-base-subtext text-sm mb-10 leading-relaxed">
              Build the body, the focus, the relationships, and the life. All at once. No shortcuts.
            </p>
            <Input
              id="name"
              label="What do people call you?"
              placeholder="First name or nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mb-6 text-left w-full"
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

        {/* ── Identity Anchor ──────────────────────────────────────── */}
        {step === 'anchor' && (
          <div className="w-full max-w-sm">
            <h2 className="font-heading text-2xl font-bold text-base-text mb-1 tracking-wide">
              Who do you want to become?
            </h2>
            <p className="text-base-subtext text-sm mb-6">
              Choose your identity anchor for this cycle.
            </p>
            <div className="flex flex-col gap-3">
              {IDENTITY_ANCHORS.map((anchor) => {
                const isSelected = anchorId === anchor.id;
                const tooltipOpen = expandedTooltip === anchor.id;
                return (
                  <div
                    key={anchor.id}
                    className={`w-full rounded border transition-colors ${
                      isSelected
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-base-border bg-base-surface hover:border-base-muted'
                    }`}
                  >
                    <div className="flex items-start p-4">
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => setAnchorId(anchor.id)}
                      >
                        <p className="font-heading font-medium text-base-text tracking-wide">
                          {anchor.name}
                        </p>
                        <p className="text-base-subtext text-xs mt-0.5">{anchor.description}</p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTooltip(tooltipOpen ? null : anchor.id);
                        }}
                        aria-label={`More about ${anchor.name}`}
                        className={`ml-3 mt-0.5 w-5 h-5 rounded-full border text-xs flex items-center justify-center shrink-0 transition-colors ${
                          tooltipOpen
                            ? 'border-accent-green text-accent-green'
                            : 'border-base-border text-base-muted hover:border-base-subtext hover:text-base-subtext'
                        }`}
                      >
                        i
                      </button>
                    </div>
                    {tooltipOpen && (
                      <p className="px-4 pb-4 text-xs text-base-subtext border-t border-base-border/40 pt-3 leading-relaxed">
                        {anchor.tooltip}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {anchorId === 'custom' && (
              <input
                className="input-field mt-3"
                placeholder="Name your identity"
                value={customAnchor}
                onChange={(e) => setCustomAnchor(e.target.value)}
              />
            )}
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep('domain')}
                disabled={!anchorId || (anchorId === 'custom' && !customAnchor.trim())}
                className="flex-1"
              >
                Lock it in
              </Button>
            </div>
          </div>
        )}

        {/* ── Domain ──────────────────────────────────────────────── */}
        {step === 'domain' && (
          <div className="w-full max-w-sm">
            <h2 className="font-heading text-2xl font-bold text-base-text mb-1 tracking-wide">
              Where do you start?
            </h2>
            <p className="text-base-subtext text-sm mb-6">
              Pick one domain. You'll add the others over the next 7 days.
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
                  <p className="text-base-subtext text-xs mt-0.5">{d.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep('action')} disabled={!domain} className="flex-1">
                Choose
              </Button>
            </div>
          </div>
        )}

        {/* ── Action ──────────────────────────────────────────────── */}
        {step === 'action' && (
          <div className="w-full max-w-sm">
            <h2 className="font-heading text-2xl font-bold text-base-text mb-1 tracking-wide">
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
            <div className="flex gap-3 mt-4">
              <Button variant="ghost" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep('win')}
                disabled={!microAction.trim()}
                className="flex-1"
              >
                Lock it in
              </Button>
            </div>
          </div>
        )}

        {/* ── Win ─────────────────────────────────────────────────── */}
        {step === 'win' && !submitting && (
          <div className="w-full max-w-sm">
            <h2 className="font-heading text-2xl font-bold text-base-text mb-2 tracking-wide">
              Do it now. We'll wait.
            </h2>
            <p className="text-base-subtext text-sm mb-6">{microAction}</p>
            <p className="text-base-subtext text-sm mb-10">
              Take 5 minutes. Come back when it's done.
            </p>
            <Button onClick={handleWin} disabled={submitting} className="w-full mb-3">
              Done. Day 0 complete.
            </Button>
            <Button variant="ghost" onClick={handleBack} className="w-full">
              Back
            </Button>
            {submitError && (
              <p role="alert" className="text-status-missed text-sm mt-4 text-center">
                {submitError}
              </p>
            )}
          </div>
        )}

        {submitting && (
          <p className="text-base-subtext text-sm">Setting up your cycle...</p>
        )}

        {/* ── Celebrate ───────────────────────────────────────────── */}
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
            <Button onClick={() => setStep('notifications')} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {/* ── Notifications ───────────────────────────────────────── */}
        {step === 'notifications' && (
          <div className="w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-accent-green/10 border border-accent-green/30 flex items-center justify-center mx-auto mb-6">
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent-green"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h2 className="font-heading text-2xl font-bold text-base-text mb-2 tracking-wide">
              Stay on track.
            </h2>
            <p className="text-base-subtext text-sm mb-10 leading-relaxed">
              Enable daily reminders so you never miss a check-in. You can turn these off any time
              in settings.
            </p>
            <Button
              onClick={async () => {
                await requestPushPermission();
                setOnboardingComplete(true);
              }}
              className="w-full mb-4"
            >
              Enable reminders
            </Button>
            <button
              type="button"
              onClick={() => setOnboardingComplete(true)}
              className="text-base-muted text-sm hover:text-base-subtext transition-colors"
            >
              Skip for now
            </button>
          </div>
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
