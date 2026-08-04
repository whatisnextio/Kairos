import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useNudge, useUpdateNudgeStatus } from '@/hooks/useNudge';
import { useAppStore } from '@/store/useAppStore';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { buildFrameworkRecommendations } from '@/utils/frameworkRecommendations';
import { Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CTA_PROMPTS: Record<string, string> = {
  reflect: 'What shifted today...',
  plan_tomorrow: 'Tomorrow I will...',
};

export default function ImproveScreen() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const authUser = useAppStore((s) => s.authUser);
  const domainFocuses = useAppStore((s) => s.domainFocuses);
  const todayCheckIns = useAppStore((s) => s.todayCheckIns);
  const setDailyCheckIn = useAppStore((s) => s.setDailyCheckIn);

  const isPaidTier = hasBrotherhoodAccess(profile?.tier);
  const today = new Date();
  const isSunday = today.getDay() === 0;
  const canSeeNudge = isPaidTier || isSunday;

  const { data: nudge, isLoading, isError, refetch } = useNudge();
  const { mutate: updateStatus } = useUpdateNudgeStatus();

  const [ctaExpanded, setCtaExpanded] = useState(false);
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | null>(null);
  const frameworkRecommendations = buildFrameworkRecommendations({
    email: authUser?.email,
    domainFocuses,
    todayCheckIns,
  });

  function handleComplete() {
    if (!nudge) return;
    updateStatus({ nudgeId: nudge.id, status: 'completed', xpReward: nudge.xpReward });
    setCtaExpanded(false);
  }

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

      {/* Error state */}
      {canSeeNudge && isError && !isLoading && (
        <Card>
          <p className="text-status-missed text-sm">
            Unable to load your nudge. You may have hit the daily limit. Try again tomorrow.
          </p>
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

          {/* CTA-driven secondary action */}
          {nudge.cta === 'check_in_now' && (
            <div className="mb-3">
              <Button size="sm" variant="ghost" onClick={() => navigate('/')}>
                Go check in
              </Button>
            </div>
          )}

          {(nudge.cta === 'reflect' || nudge.cta === 'plan_tomorrow') && !ctaExpanded && (
            <div className="mb-3">
              <Button size="sm" variant="ghost" onClick={() => setCtaExpanded(true)}>
                {nudge.cta === 'reflect' ? 'Write a reflection' : 'Plan it out'}
              </Button>
            </div>
          )}

          {ctaExpanded && nudge.cta && nudge.cta in CTA_PROMPTS && (
            <textarea
              className="input-field w-full h-20 resize-none text-sm mb-3"
              placeholder={CTA_PROMPTS[nudge.cta]}
              // biome-ignore lint/a11y/noAutofocus: textarea is primary focus when CTA expanded
              autoFocus
            />
          )}

          <Button size="sm" onClick={handleComplete}>
            Mark complete
          </Button>
          {nudge.xpReward && <p className="text-accent-green text-xs mt-3">+{nudge.xpReward} XP</p>}
        </Card>
      )}

      {/* Completed nudge */}
      {canSeeNudge && nudge && nudge.status === 'completed' && (
        <Card className="border-accent-green/40">
          <p className="text-accent-green font-heading text-xs tracking-widest uppercase mb-2">
            Done
          </p>
          <p className="font-heading text-base font-medium text-base-text mb-1">{nudge.title}</p>
          {nudge.xpReward && (
            <p className="text-accent-green text-xs mt-1">+{nudge.xpReward} XP earned</p>
          )}
        </Card>
      )}

      {/* Dismissed nudge */}
      {canSeeNudge && nudge && nudge.status === 'dismissed' && (
        <Card>
          <p className="text-base-subtext text-sm">Today's nudge dismissed. See you tomorrow.</p>
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

      <div>
        <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
          Framework options
        </h2>
        <div className="flex flex-col gap-3">
          {frameworkRecommendations.map((recommendation) => (
            <Card key={recommendation.id}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-accent-green text-xs font-heading tracking-widest uppercase mb-1">
                    {recommendation.lens}
                  </p>
                  <p className="font-heading text-base font-medium text-base-text">
                    {recommendation.title}
                  </p>
                </div>
                <span className="text-base-muted text-xs font-heading">
                  {recommendation.domainLabel}
                </span>
              </div>
              <p className="text-base-subtext text-sm mb-3">{recommendation.body}</p>
              <p className="text-base-text text-sm mb-4">{recommendation.actionText}</p>

              {activeFrameworkId === recommendation.id && (
                <textarea
                  className="input-field w-full h-20 resize-none text-sm mb-3"
                  placeholder="Write one honest line..."
                  // biome-ignore lint/a11y/noAutofocus: textarea is primary focus after opening reflection
                  autoFocus
                />
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (recommendation.lens === 'Reflect') {
                      setActiveFrameworkId((current) =>
                        current === recommendation.id ? null : recommendation.id,
                      );
                      return;
                    }
                    void setDailyCheckIn(recommendation.domainType, 'Done');
                  }}
                >
                  {recommendation.lens === 'Reflect' ? 'Write' : 'Mark done'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/detail/${recommendation.domainType.toLowerCase()}`)}
                >
                  Open domain
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Free tier gate */}
      {!isPaidTier && !isSunday && (
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
