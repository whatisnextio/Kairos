import Button from '@/components/common/Button';
import { useCycleReflection, useMarkReflectionViewed } from '@/hooks/useCycleReflection';
import { useAppStore } from '@/store/useAppStore';
import { DOMAINS } from '@/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

type Step = 'intro' | 'loading' | 'reflection' | 'your_words' | 'celebrate';

const DOMAIN_COLOURS: Record<string, string> = {
  BODY: 'text-domain-body',
  LOVE: 'text-domain-love',
  MISSION: 'text-domain-mission',
  SPIRIT: 'text-domain-spirit',
};

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
  const { completeCycle, profile, currentCycle } = useAppStore();
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

  const isBrotherhood = profile?.tier === 'brotherhood';

  async function handleComplete() {
    setSaving(true);
    await completeCycle(reflection);
    setSaving(false);
    setStep('celebrate');
  }

  function handleGetReflection() {
    setFetchReflection(true);
    setStep('loading');
  }

  // Auto-advance from loading when data arrives
  if (step === 'loading' && !reflectionLoading) {
    if (aiReflection) {
      markViewed(aiReflection.id);
      // Use setTimeout to avoid state update during render
      setTimeout(() => setStep('reflection'), 0);
    } else if (reflectionError) {
      setTimeout(() => setStep('your_words'), 0);
    }
  }

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
              Day 84 Complete
            </p>
            <h2
              id="day84-modal-title"
              className="font-heading text-4xl font-bold text-base-text mb-4 tracking-wide leading-none"
            >
              84 days.
              <br />
              You showed up.
            </h2>
            <p className="text-base-subtext text-sm leading-relaxed mb-4">
              That's{' '}
              {currentCycle?.totalXpEarned ? `${currentCycle.totalXpEarned} XP earned and` : ''} one
              full cycle of the KAIROS framework completed. Most men never finish what they start.
              You did.
            </p>
            {isBrotherhood ? (
              <>
                <p className="text-base-subtext text-sm leading-relaxed mb-8">
                  We've built your cycle reflection from 84 days of data. It's ready.
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
              84 days of data. Four domains. Six phases.
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
              {DOMAINS.map((d) => {
                const callout = aiReflection.domain_callouts?.[d.type];
                if (!callout) return null;
                return (
                  <div key={d.type} className="flex gap-2.5 items-start">
                    <span
                      className={`font-heading font-bold text-xs tracking-widest uppercase mt-0.5 shrink-0 w-16 ${DOMAIN_COLOURS[d.type]}`}
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
                    {aiReflection.stats.totalXp.toLocaleString()}
                  </p>
                  <p className="text-base-muted text-xs">XP earned</p>
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
              The man who started 84 days ago. The man who just finished. What's the gap?
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
              {isBrotherhood && (
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
              +500
            </p>
            <p className="text-base-muted text-xs mb-6">XP for completing your cycle</p>

            <h2 className="font-heading text-2xl font-bold text-base-text mb-4 tracking-wide">
              One cycle done.
            </h2>

            {aiReflection?.stats && (
              <div className="flex justify-center gap-6 mb-6">
                <div>
                  <p className="font-heading text-lg font-bold text-base-text">
                    {aiReflection.stats.totalXp.toLocaleString()}
                  </p>
                  <p className="text-base-muted text-xs">XP total</p>
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
              When you're ready, start Cycle 2. The work you laid down doesn't disappear.
            </p>
            <Button
              onClick={() => {
                onClose();
                navigate('/new-cycle');
              }}
              className="w-full mb-3"
              type="button"
            >
              Start Cycle 2
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
