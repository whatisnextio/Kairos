import Button from '@/components/common/Button';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { getDayInCycle } from '@/utils/kairos';
import { toLocalIsoDate } from '@/utils/v1Framework';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

function isMissingRpcError(message: string): boolean {
  return /function .* does not exist|could not find the function|schema cache/i.test(message);
}

async function loadCompletedCycleXp(userId: string): Promise<{ xp: number; error?: string }> {
  const { data, error } = await supabase
    .from('kairos_cycles')
    .select('total_xp_earned')
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) return { xp: 0, error: error.message };

  const xp = (data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.total_xp_earned ?? 0)),
    0,
  );
  return { xp };
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
    const today = toLocalIsoDate(new Date());
    let preservedXp = 0;

    if (currentCycle.id !== 'local-dev-cycle') {
      // All tiers have their cycle row in Supabase (created during onboarding for all users).
      // Must update it regardless of tier so bootstrap doesn't reload the cycle as 'active' on next login.
      const { error: err } = await supabase
        .from('kairos_cycles')
        .update({ status: 'abandoned', end_date: today })
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

      const { data: progressXp, error: progressErr } = await supabase.rpc(
        'reset_profile_progress',
        {
          p_user_id: authUser.id,
        },
      );
      if (progressErr) {
        if (!isMissingRpcError(progressErr.message)) {
          setError(progressErr.message);
          setAbandoning(false);
          return;
        }

        const completed = await loadCompletedCycleXp(authUser.id);
        if (completed.error) {
          setError(completed.error);
          setAbandoning(false);
          return;
        }
        preservedXp = completed.xp;

        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', authUser.id)
          .maybeSingle();
        const currentRemoteXp =
          typeof remoteProfile?.xp === 'number' ? remoteProfile.xp : (profile?.xp ?? 0);
        const { error: xpErr } = await supabase.rpc('increment_profile_xp', {
          p_user_id: authUser.id,
          p_delta: preservedXp - Math.max(0, currentRemoteXp),
        });
        if (xpErr) {
          setError(xpErr.message);
          setAbandoning(false);
          return;
        }

        await supabase.from('user_streaks').delete().eq('user_id', authUser.id);
        await supabase
          .from('ai_nudges')
          .delete()
          .eq('user_id', authUser.id)
          .eq('date', today)
          .eq('type', 'daily_nudge');
      } else {
        if (typeof progressXp === 'number') {
          preservedXp = progressXp;
        } else {
          const completed = await loadCompletedCycleXp(authUser.id);
          if (completed.error) {
            setError(completed.error);
            setAbandoning(false);
            return;
          }
          preservedXp = completed.xp;
        }
      }
    }

    archiveCurrentJourney('abandoned');
    setCurrentCycle(null);
    if (profile) setProfile({ ...profile, currentKairosCycleId: null, xp: preservedXp });
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
              This starts onboarding again. KP from this active journey, progress, and prompts
              reset. Completed journeys keep KP.
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
