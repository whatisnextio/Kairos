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
    resetJourneyMetricsLocalState,
  } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAbandon() {
    if (!authUser || !currentCycle) return;
    setAbandoning(true);
    setError(null);

    if (currentCycle.id !== 'local-dev-cycle') {
      // Protected progress fields such as KP and squad membership must reset
      // through the trusted RPC, not direct browser updates.
      const { error: resetErr } = await supabase.rpc('reset_journey_metrics');
      if (resetErr) {
        setError(resetErr.message);
        setAbandoning(false);
        return;
      }
    }

    setCurrentCycle(null);
    if (profile) setProfile({ ...profile, xp: 0, currentKairosCycleId: null, squadId: null });
    resetJourneyMetricsLocalState();
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
              This starts onboarding again. Your active journey, KP, streaks, check-ins, and local
              history reset. Your account, subscription, and preferences stay intact.
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
              Day {currentCycle ? getDayInCycle(currentCycle.startDate) : '?'} will be cleared and
              your progress metrics will return to zero. You will choose your identity, area, and
              first action again.
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
