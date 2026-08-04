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
  const {
    authUser,
    profile,
    currentCycle,
    setProfile,
    setCurrentCycle,
    setOnboardingComplete,
    resetCycleLocalState,
    archiveCurrentJourney,
  } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAbandon() {
    if (!authUser || !currentCycle) return;
    setAbandoning(true);
    setError(null);

    if (currentCycle.id !== 'local-dev-cycle') {
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

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ current_kairos_cycle_id: null })
        .eq('id', authUser.id);
      if (profileErr) {
        setError(profileErr.message);
        setAbandoning(false);
        return;
      }
    }

    archiveCurrentJourney('abandoned');
    setCurrentCycle(null);
    if (profile) setProfile({ ...profile, currentKairosCycleId: null });
    resetCycleLocalState();
    setOnboardingComplete(false);
    setAbandoning(false);
    onClose();
    navigate('/onboarding', { replace: true });
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
              Reset 12K journey?
            </h2>
            <p className="text-base-subtext text-sm mb-6">
              This starts onboarding again. Your active journey and progress reset, but previous
              history, KP, profile, and memory stay intact.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                Keep going
              </Button>
              <Button variant="danger" onClick={() => setConfirming(true)} className="flex-1">
                Reset 12K
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl font-bold text-base-text mb-2 tracking-wide">
              Are you sure?
            </h2>
            <p className="text-base-subtext text-sm mb-6">
              Day {currentCycle ? getDayInCycle(currentCycle.startDate) : '?'} will be closed and
              kept in history. You will choose your identity, domain, and first action again.
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
                {abandoning ? 'Resetting...' : 'Yes, reset'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
