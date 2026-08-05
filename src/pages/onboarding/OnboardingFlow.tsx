import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  REMINDER_INTENSITY_OPTIONS,
  type ReminderIntensity,
} from '@/services/localNotifications';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import type { DomainConfig, DomainType, IdentityAnchorId, Profile } from '@/types';
import { IDENTITY_ANCHORS, PRODUCT_POSITIONING, getAvailableDomains } from '@/types';
import { getComplimentaryProfileFields } from '@/utils/entitlements';
import { DEV_CYCLE_ID, isLocalDevUser } from '@/utils/localDevSession';
import { useEffect, useRef, useState } from 'react';

type Step = 'framework' | 'identity' | 'focus' | 'accountability' | 'commit';
const ONBOARDING_STEPS: Step[] = ['framework', 'identity', 'focus', 'accountability', 'commit'];
const STARTER_REMINDER_STYLE_IDS: IdentityAnchorId[] = ['provider', 'builder', 'guardian'];

function buildDefaultFocusSelections(domains: DomainConfig[]): Record<DomainType, string> {
  return domains.reduce(
    (acc, domain) => {
      acc[domain.type] = domain.focusOptions[0] ?? '';
      return acc;
    },
    {} as Record<DomainType, string>,
  );
}

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
    setNotificationPreferences,
    notificationPreferences,
  } = useAppStore();

  const availableDomains = getAvailableDomains(authUser?.email);
  const [step, setStep] = useState<Step>('framework');
  const [anchorId, setAnchorId] = useState<IdentityAnchorId | null>(
    profile?.identityAnchorId ?? null,
  );
  const [customAnchor, setCustomAnchor] = useState(profile?.customAnchorName ?? '');
  const [focusSelections, setFocusSelections] = useState<Record<DomainType, string>>(() =>
    buildDefaultFocusSelections(availableDomains),
  );
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [remindersEnabled, setRemindersEnabled] = useState(notificationPreferences.enabled);
  const [reminderIntensity, setReminderIntensity] = useState<ReminderIntensity>(
    notificationPreferences.intensity ?? DEFAULT_NOTIFICATION_PREFERENCES.intensity,
  );
  const [earlyProtocol, setEarlyProtocol] = useState(notificationPreferences.earlyProtocol);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  const stepNumber = ONBOARDING_STEPS.indexOf(step) + 1;
  const stepCount = ONBOARDING_STEPS.length;
  const allFocusesSelected = availableDomains.every((domain) =>
    focusSelections[domain.type]?.trim(),
  );

  useEffect(() => {
    if (step) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    document.documentElement.dataset.kairosRoute = 'onboarding';

    return () => {
      delete document.documentElement.dataset.kairosRoute;
    };
  }, []);

  const goToFramework = () => {
    setSubmitError(null);
    setStep('framework');
  };

  const goToIdentity = () => {
    setSubmitError(null);
    setStep('identity');
  };

  const goToFocus = () => {
    setSubmitError(null);
    setStep('focus');
  };

  const goToCommit = () => {
    setSubmitError(null);
    setStep('commit');
  };

  const goToAccountability = () => {
    setSubmitError(null);
    setStep('accountability');
  };

  const updateFocusSelection = (domainType: DomainType, value: string) => {
    setFocusSelections((current) => ({ ...current, [domainType]: value }));
  };

  const completeLocally = ({ today, now }: { today: string; now: string }) => {
    if (!authUser || !anchorId || !allFocusesSelected) return;

    setProfile({
      id: authUser.id,
      displayName: displayName.trim() || 'Liam',
      identityAnchorId: anchorId,
      customAnchorName: anchorId === 'custom' ? customAnchor.trim() : undefined,
      tier: 'brotherhood',
      xp: profile?.xp ?? 0,
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
      totalXpEarned: 0,
      completionPercentage: 0,
      createdAt: now,
    });
    setDomainFocuses(
      availableDomains.map((domain) => ({
        id: `local-focus-${domain.type.toLowerCase()}`,
        userId: authUser.id,
        cycleId: DEV_CYCLE_ID,
        domainType: domain.type,
        focusDescription: focusSelections[domain.type].trim(),
        setAt: now,
      })),
    );
    setTodayCheckIns({});
    setNotificationPreferences({
      enabled: remindersEnabled,
      intensity: reminderIntensity,
      earlyProtocol,
      webPushEnabled: false,
    });
    setOnboardingComplete(true);
  };

  const handleCommit = async () => {
    if (submitInFlight.current || !authUser || !anchorId || !allFocusesSelected) return;
    submitInFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const complimentaryFields = getComplimentaryProfileFields(authUser.email);

    try {
      if (currentCycle?.status === 'active' || profile?.currentKairosCycleId) {
        setOnboardingComplete(true);
        return;
      }

      if (isLocalDevUser(authUser.id)) {
        completeLocally({ today, now });
        return;
      }

      const {
        data: { user: fullUser },
      } = await supabase.auth.getUser();
      const dobFromAuth: string = fullUser?.user_metadata?.date_of_birth ?? today;
      const cleanName = displayName.trim() || 'Anonymous';
      const cleanCustomAnchor = anchorId === 'custom' ? customAnchor.trim() : null;
      const focusRows = availableDomains.map((domain) => ({
        user_id: authUser.id,
        domain_type: domain.type,
        focus_description: focusSelections[domain.type].trim(),
      }));

      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          display_name: cleanName,
          identity_anchor_id: anchorId,
          custom_anchor_name: cleanCustomAnchor,
          date_of_birth: dobFromAuth,
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
        throw new Error(cycleErr?.message ?? 'Could not create your 12K plan. Try again.');
      }

      const { data: focusRowsSaved, error: focusErr } = await supabase
        .from('user_domain_focuses')
        .insert(focusRows.map((row) => ({ ...row, cycle_id: cycle.id })))
        .select();

      if (focusErr || !focusRowsSaved) {
        throw new Error(focusErr?.message ?? 'Could not save your starter actions.');
      }

      let entitledProfileRow = profileRow;
      if ('tier' in complimentaryFields) {
        const { data: claimedProfile, error: claimErr } = await supabase.rpc(
          'claim_complimentary_lifechanger',
        );
        if (claimedProfile) {
          entitledProfileRow = claimedProfile as Record<string, unknown>;
        } else {
          console.error('Complimentary entitlement claim failed:', claimErr?.message);
        }
      }

      const { error: linkErr } = await supabase
        .from('profiles')
        .update({ current_kairos_cycle_id: cycle.id })
        .eq('id', authUser.id);

      if (linkErr) {
        throw new Error('Setup failed. Please try again.');
      }

      setProfile({
        id: authUser.id,
        displayName: cleanName,
        identityAnchorId: anchorId,
        customAnchorName: cleanCustomAnchor ?? undefined,
        tier: entitledProfileRow.tier as Profile['tier'],
        xp: profile?.xp ?? 0,
        currentKairosCycleId: cycle.id,
        dateOfBirth: dobFromAuth,
        squadId: null,
        stripeCustomerId: entitledProfileRow.stripe_customer_id as string | null,
        stripeSubscriptionId: entitledProfileRow.stripe_subscription_id as string | null,
        subscriptionStatus: entitledProfileRow.subscription_status as string | null,
        cancelAtPeriodEnd: (entitledProfileRow.cancel_at_period_end as boolean | null) ?? false,
        currentPeriodEnd: entitledProfileRow.current_period_end as string | null,
        createdAt: entitledProfileRow.created_at as string,
        updatedAt: entitledProfileRow.updated_at as string,
      });
      setCurrentCycle({
        id: cycle.id,
        userId: authUser.id,
        startDate: today,
        endDate: null,
        status: 'active',
        totalXpEarned: 0,
        completionPercentage: 0,
        createdAt: cycle.created_at,
      });
      setDomainFocuses(
        focusRowsSaved.map((focus) => ({
          id: focus.id,
          userId: authUser.id,
          cycleId: cycle.id,
          domainType: focus.domain_type as DomainType,
          focusDescription: focus.focus_description,
          setAt: focus.set_at,
        })),
      );
      setTodayCheckIns({});
      setNotificationPreferences({
        enabled: remindersEnabled,
        intensity: reminderIntensity,
        earlyProtocol,
        webPushEnabled: false,
      });
      setOnboardingComplete(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-2xl rounded-[20px] border border-white/10 bg-base-black/80 px-4 py-5 shadow-[0_32px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:px-7 sm:py-7">
        <div className="mb-6 flex items-center justify-between">
          <p className="font-heading text-xs text-base-muted tracking-widest uppercase">12K</p>
          <p className="text-base-muted text-xs">
            {stepNumber} of {stepCount}
          </p>
        </div>

        {step === 'framework' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Start your 12K plan.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-4">
              12K helps you choose simple actions for Body, Fuel, Self, and Connection.
            </p>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              Set up your four starter actions now. Nothing is marked Done until you actually do it.
            </p>
            <p className="text-base-muted text-xs leading-relaxed mb-5">
              {PRODUCT_POSITIONING.audience}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {availableDomains.map((d) => (
                <div key={d.type} className="rounded border border-base-border bg-base-surface p-3">
                  <p className={`font-heading text-sm font-medium tracking-wide ${d.colour}`}>
                    {d.label}
                  </p>
                  <p className="text-base-subtext text-xs mt-1 leading-snug">{d.description}</p>
                </div>
              ))}
            </div>

            <Button onClick={goToIdentity} className="w-full">
              Start setup
            </Button>
          </section>
        )}

        {step === 'identity' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Tell us your name.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              This keeps the app personal. The reminder style only changes how prompts feel.
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
              Reminder style
            </p>
            <p className="text-base-subtext text-xs leading-relaxed mb-3">
              Pick the one that feels closest. You can change it later.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {IDENTITY_ANCHORS.filter((anchor) =>
                STARTER_REMINDER_STYLE_IDS.includes(anchor.id),
              ).map((anchor) => (
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
                placeholder="Name your reminder style"
                value={customAnchor}
                onChange={(event) => setCustomAnchor(event.target.value)}
              />
            )}

            <div className="flex gap-3 mt-5">
              <Button variant="ghost" onClick={goToFramework} className="flex-1">
                Back
              </Button>
              <Button
                onClick={goToFocus}
                disabled={
                  !displayName.trim() ||
                  !anchorId ||
                  (anchorId === 'custom' && !customAnchor.trim())
                }
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === 'focus' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Choose your four actions.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              Pick one simple starter action in each area. These are your targets. They are not
              marked Done yet.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {availableDomains.map((d) => (
                <div key={d.type} className="rounded border border-base-border bg-base-surface p-3">
                  <p className={`font-heading font-medium tracking-wide ${d.colour}`}>{d.label}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {d.focusOptions.map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => updateFocusSelection(d.type, option)}
                        className={`rounded border px-3 py-2 text-left text-sm transition-colors ${
                          focusSelections[d.type] === option
                            ? 'border-accent-green bg-accent-green/10 text-base-text'
                            : 'border-base-border bg-base-black/20 text-base-subtext hover:border-base-muted'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input-field mt-2 h-16 resize-none text-sm"
                    placeholder="Or write your own action"
                    value={
                      d.focusOptions.includes(focusSelections[d.type])
                        ? ''
                        : focusSelections[d.type]
                    }
                    onChange={(event) => updateFocusSelection(d.type, event.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="ghost" onClick={() => setStep('identity')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={goToAccountability}
                disabled={!allFocusesSelected}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === 'accountability' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Choose reminder level.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              Choose how often 12K should remind you. You can change this later.
            </p>

            <div className="grid grid-cols-1 gap-2 mb-5">
              {REMINDER_INTENSITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setReminderIntensity(option.id)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    reminderIntensity === option.id
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-base-border bg-base-surface hover:border-base-muted'
                  }`}
                >
                  <p className="font-heading font-medium text-base-text tracking-wide">
                    {option.label}
                  </p>
                  <p className="text-base-subtext text-xs mt-0.5">{option.description}</p>
                </button>
              ))}
            </div>

            <label className="flex items-start gap-3 rounded border border-base-border bg-base-surface p-3 mb-3">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(event) => setRemindersEnabled(event.target.checked)}
                className="mt-0.5 accent-accent-green"
              />
              <span>
                <span className="block text-sm font-medium text-base-text">Enable reminders</span>
                <span className="block text-xs text-base-subtext mt-0.5">
                  You can change this later from You. Your browser may still ask for permission.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded border border-base-border bg-base-surface p-3">
              <input
                type="checkbox"
                checked={earlyProtocol}
                onChange={(event) => setEarlyProtocol(event.target.checked)}
                disabled={!remindersEnabled}
                className="mt-0.5 accent-accent-green disabled:opacity-50"
              />
              <span>
                <span className="block text-sm font-medium text-base-text">Early morning help</span>
                <span className="block text-xs text-base-subtext mt-0.5">
                  Useful if early starts turn into scrolling or lost time.
                </span>
              </span>
            </label>

            <div className="flex gap-3 mt-5">
              <Button variant="ghost" onClick={() => setStep('focus')} className="flex-1">
                Back
              </Button>
              <Button onClick={goToCommit} className="flex-1">
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === 'commit' && (
          <section>
            <h1 className="font-heading text-3xl font-bold text-base-text tracking-wide mb-2">
              Ready to start.
            </h1>
            <p className="text-base-subtext text-sm leading-relaxed mb-5">
              Your four actions are set. Go to Home, do one action, then mark it Done.
            </p>

            <div className="grid grid-cols-1 gap-2 mb-4" aria-label="Chosen actions">
              {availableDomains.map((domain) => (
                <div
                  key={domain.type}
                  className="rounded border border-base-border bg-base-surface p-3"
                >
                  <p className={`font-heading text-sm ${domain.colour}`}>{domain.label}</p>
                  <p className="mt-1 text-sm text-base-text">{focusSelections[domain.type]}</p>
                </div>
              ))}
            </div>

            <div className="rounded border border-accent-green/40 bg-accent-green/10 p-3">
              <p className="text-sm text-base-text">
                Setup does not mark anything as Done. Your first tick happens after you take action.
              </p>
            </div>

            {submitError && (
              <p role="alert" className="text-status-missed text-sm mt-3">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <Button
                variant="ghost"
                onClick={() => setStep('accountability')}
                disabled={submitting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCommit}
                disabled={!allFocusesSelected || submitting}
                className="flex-1"
              >
                {submitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-base-black/30 border-t-base-black"
                      aria-hidden="true"
                    />
                    Starting...
                  </span>
                ) : (
                  'Start 12K'
                )}
              </Button>
            </div>

            <p className="text-base-muted text-xs text-center mt-4">
              Reminder level can be changed later from You.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
