import Button from '@/components/common/Button';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { getDayInCycle } from '@/utils/kairos';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

export default function AbandonCycleModal({ onClose }: Props) {
  const navigate = useNavigate();
  const { authUser, currentCycle, setCurrentCycle, resetCycleLocalState } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAbandon() {
    if (!authUser || !currentCycle) return;
    setAbandoning(true);
    setError(null);

    // All tiers have their cycle row in Supabase (created during onboarding for all users).
    // Must update it regardless of tier so bootstrap doesn't reload the cycle as 'active' on next login.
    const { error: err } = await supabase
      .from('kairos_cycles')
      .update({ status: 'abandoned', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', currentCycle.id);
    if (err) {
      setError(err.message);
      setAbandoning(false);
      return;
    }

    setCurrentCycle({ ...currentCycle, status: 'abandoned' });
    resetCycleLocalState();
    setAbandoning(false);
    onClose();
    navigate('/new-cycle', { replace: true });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: bottom-sheet modal, dialog element requires separate refactor */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="abandon-modal-title"
        className="w-full max-w-md bg-base-surface rounded-t-2xl px-6 pt-6 pb-10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-base-border rounded-full mx-auto mb-6" />

        {!confirming ? (
          <>
            <h2
              id="abandon-modal-title"
              className="font-heading text-xl font-bold text-base-text mb-2 tracking-wide"
            >
              Reset your cycle?
            </h2>
            <p className="text-base-subtext text-sm mb-6">
              This marks your current cycle as abandoned and starts fresh. XP earned is kept.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                Keep going
              </Button>
              <Button variant="danger" onClick={() => setConfirming(true)} className="flex-1">
                Reset cycle
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl font-bold text-base-text mb-2 tracking-wide">
              Are you sure?
            </h2>
            <p className="text-base-subtext text-sm mb-6">
              Day {currentCycle ? getDayInCycle(currentCycle.startDate) : '?'} progress will be
              marked abandoned. This cannot be undone.
            </p>
            {error && (
              <p role="alert" className="text-status-missed text-xs mb-3">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirming(false)} className="flex-1">
                Go back
              </Button>
              <Button
                variant="danger"
                onClick={handleAbandon}
                disabled={abandoning}
                className="flex-1"
              >
                {abandoning ? 'Abandoning…' : 'Yes, reset it'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
