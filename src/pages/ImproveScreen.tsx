import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { Zap } from 'lucide-react';

export default function ImproveScreen() {
  const { profile, todayNudge, setNudgeStatus, isNudgeLoading } = useAppStore();

  const isBrotherhood = profile?.tier === 'brotherhood';
  const today = new Date();
  const isSunday = today.getDay() === 0;
  const canSeeFreeNudge = !isBrotherhood && isSunday;
  const canSeeNudge = isBrotherhood || canSeeFreeNudge;

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">Improve</h1>
        {canSeeNudge && (
          <button className="text-base-subtext hover:text-base-text transition-colors">
            <Zap size={18} />
          </button>
        )}
      </div>

      {/* Today's nudge */}
      {canSeeNudge && todayNudge && todayNudge.status === 'new' && (
        <Card className="border-accent-green/40">
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">Today's nudge</p>
          <p className="font-heading text-base font-medium text-base-text mb-1">{todayNudge.title}</p>
          <p className="text-base-subtext text-sm mb-4">{todayNudge.body}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setNudgeStatus(todayNudge.id, 'accepted')}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNudgeStatus(todayNudge.id, 'dismissed')}
            >
              Dismiss
            </Button>
          </div>
          {todayNudge.xpReward && (
            <p className="text-accent-green text-xs mt-3">+{todayNudge.xpReward} XP on completion</p>
          )}
        </Card>
      )}

      {canSeeNudge && !todayNudge && !isNudgeLoading && (
        <Card>
          <p className="text-base-subtext text-sm">
            Your nudge is being generated. Check back shortly.
          </p>
        </Card>
      )}

      {isNudgeLoading && (
        <Card>
          <p className="text-base-subtext text-sm">Generating your nudge...</p>
        </Card>
      )}

      {/* Free tier gate */}
      {!isBrotherhood && !isSunday && (
        <Card className="relative overflow-hidden">
          <div className="blur-sm pointer-events-none select-none">
            <p className="font-heading text-base font-medium text-base-text mb-1">Your daily nudge</p>
            <p className="text-base-subtext text-sm">
              A sharp, personal message based on where you are in your cycle.
            </p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-surface/80 p-4 text-center">
            <p className="font-heading font-medium text-base-text text-sm mb-3">
              Daily nudges are a Brotherhood feature.
            </p>
            <Button size="sm" onClick={() => {}}>
              Unlock Brotherhood, £7.99/mo
            </Button>
            <p className="text-base-muted text-xs mt-3">Free tier gets one nudge on Sundays.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
