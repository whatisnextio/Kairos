import Button from '@/components/common/Button';
import { useCycleReflection, useMarkReflectionViewed } from '@/hooks/useCycleReflection';
import { useAppStore } from '@/store/useAppStore';
import { KAIROS_CYCLE_LENGTH_DAYS, XP_PER_CYCLE_COMPLETE, getAvailableDomains } from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { formatKairosPoints } from '@/utils/gamification';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

type Step = 'intro' | 'loading' | 'reflection' | 'your_words' | 'celebrate';

function PulsingDots() {
  return (
    <div className="flex gap-1.5 items-center justify-center py-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  );
}

export default function Day84CompletionModal({ onClose }: Props) {
  const navigate = useNavigate();
  const { authUser, completeCycle, profile, currentCycle, journeyArchive, setNextCycleIntention } =
    useAppStore();
  const [step, setStep] = useState<Step>('intro');
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchReflection, setFetchReflection] = useState(false);

  const {
    data: aiReflection,
    isLoading: reflectionLoading,
    error: reflectionError,
  } = useCycleReflection(fetchReflection);
  const { mutate: markViewed } = useMarkReflectionViewed();

  const hasReflectionAccess = hasBrotherhoodAccess(profile?.tier);
  const availableDomains = getAvailableDomains(authUser?.email);
  const nextCycleNumber = (journeyArchive?.length ?? 0) + 2;
  const domainColours: Record<string, string> = Object.fromEntries(
    availableDomains.map((d) => [d.type, d.colour]),
  );

  async function handleComplete() {
    if (currentCycle?.status === 'completed') {
      setStep('celebrate');
      return;
    }
    setSaving(true);
    await completeCycle(reflection);
    setSaving(false);
    setStep('celebrate');
  }

  function handleGetReflection() {
    setFetchReflection(true);
    setStep('loading');
  }

  // Auto-advance from loading when data arrives. Must be in useEffect, not render body.
  useEffect(() => {
    if (step !== 'loading' || reflectionLoading) return;
    if (aiReflection) {
      markViewed(aiReflection.id);
      // Seed next cycle intention so NewCycleScreen can show it.
      if (aiReflection.next_cycle_intention) {
        setNextCycleIntention(aiReflection.next_cycle_intention);
      }
      setStep('reflection');
    } else if (reflectionError) {
      setStep('your_words');
    }
  }, [step, reflectionLoading, aiReflection, reflectionError, markViewed, setNextCycleIntention]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6">
      {/* biome-ignore lint/a11y/useSemanticElements: centered modal, dialog element requires separate refactor */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day84-modal-title"
        className="w-full max-w-sm bg-base-surface rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* ── INTRO ────────────────────────────────────────────────────── */}
        {step === 'intro' && (
          <div className="px-6 py-8">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-4">
              Campaign Complete
            </p>
            <h2
              id="day84-modal-title"
              className="font-heading text-4xl font-bold text-base-text mb-4 tracking-wide leading-none"
            >
              {KAIROS_CYCLE_LENGTH_DAYS} days.
              <br />
              You showed up.
            </h2>
            <p className="text-base-subtext text-sm leading-relaxed mb-4">
              That's{' '}
              {currentCycle?.totalXpEarned
                ? `${formatKairosPoints(currentCycle.totalXpEarned)} earned and `
                : ''}
              one full campaign of the KAIROS framework completed. Most people never finish what
              they start. You did.
            </p>
            {hasReflectionAccess ? (
              <>
                <p className="text-base-subtext text-sm leading-relaxed mb-8">
                  We've built your campaign reflection from {KAIROS_CYCLE_LENGTH_DAYS} days of data.
                  It's ready.
                </p>
                <Button onClick={handleGetReflection} className="w-full mb-3">
                  See my reflection
                </Button>
              </>
            ) : (
              <>
                <p className="text-base-subtext text-sm leading-relaxed mb-8">
                  Before you close the cycle, take a moment to reflect on who you became.
                </p>
                <Button onClick={() => setStep('your_words')} className="w-full mb-3">
                  Reflect
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={onClose} className="w-full">
              Later
            </Button>
          </div>
        )}

        {/* ── LOADING ──────────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="px-6 py-8">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-6">
              Building your reflection
            </p>
            <p className="text-base-subtext text-sm mb-2">
              {KAIROS_CYCLE_LENGTH_DAYS} days of data. {availableDomains.length} domains. Six
              phases.
            </p>
            <p className="text-base-muted text-xs mb-4">This takes a few seconds.</p>
            <PulsingDots />
          </div>
        )}

        {/* ── AI REFLECTION ────────────────────────────────────────────── */}
        {step === 'reflection' && aiReflection && (
          <div className="px-6 py-8">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-4">
              Cycle Reflection
            </p>

            {/* Headline */}
            <h2
              id="day84-modal-title"
              className="font-heading text-2xl font-bold text-accent-green mb-4 tracking-wide leading-tight"
            >
              {aiReflection.title}
            </h2>

            {/* Body */}
            <p className="text-base-text text-sm leading-relaxed mb-6">{aiReflection.body}</p>

            {/* Domain callouts */}
            <div className="flex flex-col gap-2 mb-6">
              {availableDomains.map((d) => {
                const callout = aiReflection.domain_callouts?.[d.type];
                if (!callout) return null;
                return (
                  <div key={d.type} className="flex gap-2.5 items-start">
                    <span
                      className={`font-heading font-bold text-xs tracking-widest uppercase mt-0.5 shrink-0 w-16 ${domainColours[d.type]}`}
                    >
                      {d.label}
                    </span>
                    <p className="text-base-subtext text-xs leading-snug">{callout}</p>
                  </div>
                );
              })}
            </div>

            {/* Stats strip */}
            {aiReflection.stats && (
              <div className="flex gap-4 border-t border-base-border pt-4 mb-6">
                <div>
                  <p className="font-heading text-base font-bold text-accent-green">
                    {formatKairosPoints(aiReflection.stats.totalXp)}
                  </p>
                  <p className="text-base-muted text-xs">KP earned</p>
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-base-text">
                    {aiReflection.stats.overallCompletionRate}%
                  </p>
                  <p className="text-base-muted text-xs">completion</p>
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-base-text">
                    {aiReflection.stats.totalCheckIns}
                  </p>
                  <p className="text-base-muted text-xs">check-ins</p>
                </div>
              </div>
            )}

            {/* Next cycle intention */}
            {aiReflection.next_cycle_intention && (
              <p className="text-base-muted text-xs italic border-l-2 border-accent-green/40 pl-3 mb-6">
                {aiReflection.next_cycle_intention}
              </p>
            )}

            <Button onClick={() => setStep('your_words')} className="w-full">
              Add your own words
            </Button>
          </div>
        )}

        {/* ── YOUR WORDS ───────────────────────────────────────────────── */}
        {step === 'your_words' && (
          <div className="px-6 py-8">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-3">
              Your reflection
            </p>
            <h2 className="font-heading text-xl font-bold text-base-text mb-2 tracking-wide">
              What shifted in you?
            </h2>
            <p className="text-base-subtext text-sm mb-4">
              The person who started {KAIROS_CYCLE_LENGTH_DAYS} days ago. The person who just
              finished. What's the gap?
            </p>
            <textarea
              className="input-field h-36 resize-none w-full mb-2 text-sm"
              placeholder="I used to... Now I..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              // biome-ignore lint/a11y/noAutofocus: textarea is the sole focus of this step
              autoFocus
            />
            <p className="text-base-muted text-xs mb-6">Optional, but it matters.</p>
            <div className="flex gap-3">
              {hasReflectionAccess && (
                <Button
                  variant="ghost"
                  onClick={() => setStep('reflection')}
                  className="flex-1"
                  type="button"
                >
                  Back
                </Button>
              )}
              <Button onClick={handleComplete} disabled={saving} className="flex-1" type="button">
                {saving ? 'Saving…' : 'Close the cycle'}
              </Button>
            </div>
          </div>
        )}

        {/* ── CELEBRATE ────────────────────────────────────────────────── */}
        {step === 'celebrate' && (
          <div className="px-6 py-8 text-center">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-4">
              Cycle complete
            </p>
            <p className="font-heading text-5xl font-bold text-accent-green mb-2 tracking-widest">
              +{formatKairosPoints(XP_PER_CYCLE_COMPLETE)}
            </p>
            <p className="text-base-muted text-xs mb-6">Kairos Points for completing your cycle</p>

            <h2 className="font-heading text-2xl font-bold text-base-text mb-4 tracking-wide">
              One cycle done.
            </h2>

            {aiReflection?.stats && (
              <div className="flex justify-center gap-6 mb-6">
                <div>
                  <p className="font-heading text-lg font-bold text-base-text">
                    {formatKairosPoints(aiReflection.stats.totalXp)}
                  </p>
                  <p className="text-base-muted text-xs">KP total</p>
                </div>
                <div>
                  <p className="font-heading text-lg font-bold text-base-text">
                    {aiReflection.stats.totalCheckIns}
                  </p>
                  <p className="text-base-muted text-xs">check-ins</p>
                </div>
                <div>
                  <p className="font-heading text-lg font-bold text-base-text">
                    {aiReflection.stats.overallCompletionRate}%
                  </p>
                  <p className="text-base-muted text-xs">done</p>
                </div>
              </div>
            )}

            <p className="text-base-subtext text-sm mb-8">
              When you're ready, start Cycle {nextCycleNumber}. The work you laid down doesn't
              disappear.
            </p>
            <Button
              onClick={() => {
                onClose();
                navigate('/new-cycle');
              }}
              className="w-full mb-3"
              type="button"
            >
              Start Cycle {nextCycleNumber}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full" type="button">
              Take a break first
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
