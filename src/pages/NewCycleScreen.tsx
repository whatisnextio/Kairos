import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { IDENTITY_ANCHORS, type IdentityAnchorId } from '@/types';
import { toLocalIsoDate } from '@/utils/v1Framework';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewCycleScreen() {
  const navigate = useNavigate();
  const {
    authUser,
    profile,
    currentCycle,
    setProfile,
    setCurrentCycle,
    resetCycleLocalState,
    archiveCurrentJourney,
    nextCycleIntention,
  } = useAppStore();
  const [anchorId, setAnchorId] = useState<IdentityAnchorId | null>(
    profile?.identityAnchorId ?? null,
  );
  const [customAnchor, setCustomAnchor] = useState(profile?.customAnchorName ?? '');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycleNumber, setCycleNumber] = useState(2);

  useEffect(() => {
    if (currentCycle?.status === 'active') {
      navigate('/', { replace: true });
    }
  }, [currentCycle, navigate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: supabase client is module-singleton; setCycleNumber is stable
  useEffect(() => {
    if (!authUser) return;
    supabase
      .from('kairos_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .then(({ count }) => {
        if (count != null) setCycleNumber(count + 1);
      });
  }, [authUser?.id]);

  if (!authUser || !profile) return null;

  async function handleStart() {
    if (!anchorId || !authUser || !profile) return;
    setStarting(true);
    setError(null);

    const today = toLocalIsoDate(new Date());

    const { data: cycle, error: cycleErr } = await supabase
      .from('kairos_cycles')
      .insert({ user_id: authUser.id, start_date: today, status: 'active' })
      .select()
      .single();

    if (cycleErr || !cycle) {
      setError(cycleErr?.message ?? 'Failed to start round');
      setStarting(false);
      return;
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        current_kairos_cycle_id: cycle.id,
        identity_anchor_id: anchorId,
        custom_anchor_name: anchorId === 'custom' ? customAnchor : null,
      })
      .eq('id', authUser.id);

    if (profileErr) {
      setError(profileErr.message);
      setStarting(false);
      return;
    }

    archiveCurrentJourney('completed');

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

    setProfile({
      ...profile,
      currentKairosCycleId: cycle.id,
      identityAnchorId: anchorId,
      customAnchorName: anchorId === 'custom' ? customAnchor : undefined,
    });

    resetCycleLocalState();
    setStarting(false);
    navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
      <div>
        <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-1">
          Round {cycleNumber}
        </p>
        <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">
          Start fresh.
        </h1>
        <p className="text-base-subtext text-sm mt-1">Same system. Fresh start.</p>
      </div>

      {/* Seed from previous round's AI reflection */}
      {nextCycleIntention && (
        <div className="rounded-xl border border-accent-green/30 bg-accent-green/5 px-4 py-4">
          <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-2">
            From your last round
          </p>
          <p className="text-base-text text-sm italic">{nextCycleIntention}</p>
        </div>
      )}

      <Card>
        <p className="font-heading text-xs text-base-subtext tracking-widest uppercase mb-3">
          Your reminder style
        </p>
        <p className="text-base-subtext text-xs mb-4">
          You can keep the same role or choose the one that best fits this round.
        </p>
        <div className="flex flex-col gap-2">
          {IDENTITY_ANCHORS.map((anchor) => (
            <button
              type="button"
              key={anchor.id}
              onClick={() => setAnchorId(anchor.id)}
              className={`w-full text-left p-3 rounded border transition-colors text-sm ${
                anchorId === anchor.id
                  ? 'border-accent-green bg-accent-green/10'
                  : 'border-base-border bg-base-surface hover:border-base-muted'
              }`}
            >
              <span
                className={`font-heading font-medium tracking-wide ${
                  anchorId === anchor.id ? 'text-accent-green' : 'text-base-text'
                }`}
              >
                {anchor.name}
              </span>
              <span className="text-base-subtext text-xs block mt-0.5">{anchor.description}</span>
            </button>
          ))}
        </div>
        {anchorId === 'custom' && (
          <input
            className="input-field mt-3"
            placeholder="Name your reminder style"
            value={customAnchor}
            onChange={(e) => setCustomAnchor(e.target.value)}
          />
        )}
      </Card>

      {error && (
        <p role="alert" className="text-status-missed text-sm">
          {error}
        </p>
      )}

      <Button
        onClick={handleStart}
        disabled={!anchorId || (anchorId === 'custom' && !customAnchor.trim()) || starting}
        className="w-full"
      >
        {starting ? 'Starting...' : `Begin round ${cycleNumber}`}
      </Button>

      <p className="text-base-muted text-xs text-center">
        Your four areas will be ready when you start.
      </p>
    </div>
  );
}
