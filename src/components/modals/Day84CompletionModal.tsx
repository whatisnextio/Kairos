import Button from '@/components/common/Button';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

type Step = 'intro' | 'reflect' | 'celebrate';

export default function Day84CompletionModal({ onClose }: Props) {
  const navigate = useNavigate();
  const { completeCycle } = useAppStore();
  const [step, setStep] = useState<Step>('intro');
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    await completeCycle(reflection);
    setSaving(false);
    setStep('celebrate');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
      {/* biome-ignore lint/a11y/useSemanticElements: centered modal, dialog element requires separate refactor */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day84-modal-title"
        className="w-full max-w-sm bg-base-surface rounded-2xl px-6 py-8"
      >
        {step === 'intro' && (
          <>
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-3">
              Day 84 Complete
            </p>
            <h2
              id="day84-modal-title"
              className="font-heading text-3xl font-bold text-base-text mb-4 tracking-wide leading-tight"
            >
              You did it.
            </h2>
            <p className="text-base-subtext text-sm mb-6">
              84 days. Four domains. One identity.{'\n'}
              You showed up when it was hard.
            </p>
            <p className="text-base-subtext text-sm mb-8">
              Before you close the cycle, take 2 minutes to reflect on who you became.
            </p>
            <Button onClick={() => setStep('reflect')} className="w-full">
              Reflect
            </Button>
          </>
        )}

        {step === 'reflect' && (
          <>
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-3">
              Cycle Reflection
            </p>
            <h2 className="font-heading text-xl font-bold text-base-text mb-4 tracking-wide">
              What shifted in you?
            </h2>
            <p className="text-base-subtext text-sm mb-4">
              Describe the man you are now versus the man who started 84 days ago.
            </p>
            <textarea
              className="input-field h-36 resize-none w-full mb-4"
              placeholder="I used to... Now I..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('intro')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!reflection.trim() || saving}
                className="flex-1"
              >
                {saving ? 'Saving…' : 'Close the cycle'}
              </Button>
            </div>
          </>
        )}

        {step === 'celebrate' && (
          <div className="text-center">
            <p className="font-heading text-5xl font-bold text-accent-green mb-4 tracking-widest">
              +500 XP
            </p>
            <h2 className="font-heading text-2xl font-bold text-base-text mb-3 tracking-wide">
              Cycle Complete.
            </h2>
            <p className="text-base-subtext text-sm mb-2">Your reflection has been saved.</p>
            <p className="text-base-subtext text-sm mb-8">
              When you're ready, start your next 84 days.
            </p>
            <Button
              onClick={() => {
                onClose();
                navigate('/new-cycle');
              }}
              className="w-full mb-3"
            >
              Start Cycle 2
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full">
              Later
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
