import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useNudge, useUpdateNudgeStatus } from '@/hooks/useNudge';
import { useAppStore } from '@/store/useAppStore';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ImproveScreen() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);

  const isBrotherhood = profile?.tier === 'brotherhood';
  const today = new Date();
  const isSunday = today.getDay() === 0;
  const canSeeNudge = isBrotherhood || isSunday;

  const { data: nudge, isLoading, refetch } = useNudge();
  const { mutate: updateStatus } = useUpdateNudgeStatus();

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">Improve</h1>
        {canSeeNudge && (
          <button
            type="button"
            onClick={() => refetch()}
            className="text-base-subtext hover:text-base-text transition-colors"
            aria-label="Refresh nudge"
          >
            <Zap size={18} />
          </button>
        )}
      </div>

      {/* Loading state */}
      {canSeeNudge && isLoading && (
        <Card>
          <p className="text-base-subtext text-sm">Generating your nudge...</p>
        </Card>
      )}

      {/* Today's nudge */}
      {canSeeNudge && nudge && nudge.status === 'new' && (
        <Card className="border-accent-green/40">
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Today's nudge
          </p>
          <p className="font-heading text-base font-medium text-base-text mb-1">{nudge.title}</p>
          <p className="text-base-subtext text-sm mb-4">{nudge.body}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateStatus({ nudgeId: nudge.id, status: 'accepted' })}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatus({ nudgeId: nudge.id, status: 'dismissed' })}
            >
              Dismiss
            </Button>
          </div>
          {nudge.xpReward && (
            <p className="text-accent-green text-xs mt-3">+{nudge.xpReward} XP on completion</p>
          )}
        </Card>
      )}

      {/* Accepted nudge */}
      {canSeeNudge && nudge && nudge.status === 'accepted' && (
        <Card className="border-accent-green/40">
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Accepted
          </p>
          <p className="font-heading text-base font-medium text-base-text mb-1">{nudge.title}</p>
          <p className="text-base-subtext text-sm mb-4">{nudge.body}</p>
          <Button
            size="sm"
            onClick={() =>
              updateStatus({ nudgeId: nudge.id, status: 'completed', xpReward: nudge.xpReward })
            }
          >
            Mark complete
          </Button>
          {nudge.xpReward && <p className="text-accent-green text-xs mt-3">+{nudge.xpReward} XP</p>}
        </Card>
      )}

      {/* No nudge yet */}
      {canSeeNudge && !nudge && !isLoading && (
        <Card>
          <p className="text-base-subtext text-sm mb-3">
            No nudge yet today. Tap the lightning bolt to generate one.
          </p>
          <Button size="sm" onClick={() => refetch()}>
            Generate nudge
          </Button>
        </Card>
      )}

      {/* Free tier gate */}
      {!isBrotherhood && !isSunday && (
        <Card className="relative overflow-hidden">
          <div className="blur-sm pointer-events-none select-none">
            <p className="font-heading text-base font-medium text-base-text mb-1">
              Your daily nudge
            </p>
            <p className="text-base-subtext text-sm">
              A sharp, personal message based on where you are in your cycle.
            </p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-surface/80 p-4 text-center">
            <p className="font-heading font-medium text-base-text text-sm mb-3">
              Daily nudges are a Brotherhood feature.
            </p>
            <Button size="sm" onClick={() => navigate('/subscription')}>
              Unlock Brotherhood, £7.99/mo
            </Button>
            <p className="text-base-muted text-xs mt-3">Free tier gets one nudge on Sundays.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
