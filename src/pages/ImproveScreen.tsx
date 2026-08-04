import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useNudge, useUpdateNudgeStatus } from '@/hooks/useNudge';
import { useAppStore } from '@/store/useAppStore';
import type { AiNudge, DomainType, ImproveCardSnapshot, NudgeCta, NudgeStatus } from '@/types';
import { SUBSCRIPTION_COPY } from '@/utils/brandCopy';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { buildFrameworkRecommendations } from '@/utils/frameworkRecommendations';
import { getCurrentPhaseConfig, getDayInCycle } from '@/utils/kairos';
import { Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CTA_PROMPTS: Record<Exclude<NudgeCta, 'check_in_now' | null>, string> = {
  reflect: 'What shifted today...',
  plan_tomorrow: 'Tomorrow I will...',
};

const STATUS_LABELS: Record<NudgeStatus, string> = {
  new: 'New',
  accepted: 'Active',
  completed: 'Done',
  dismissed: 'Dismissed',
};

interface ImproveCard {
  id: string;
  kind: 'ai' | 'framework';
  status: NudgeStatus;
  lens: string;
  title: string;
  body: string;
  domainLabel: string;
  phaseLabel: string;
  actionText: string;
  xpReward: number;
  cta: NudgeCta;
  nudge?: AiNudge;
  domainType?: DomainType;
  customRouteId?: string;
}

interface ImproveCardContentProps {
  card: ImproveCard;
  activeCardId: string | null;
  ctaExpanded: boolean;
  rewarded: boolean;
  isUpdating: boolean;
  onToggleWrite: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onComplete: () => void;
}

function ImproveCardContent({
  card,
  activeCardId,
  ctaExpanded,
  rewarded,
  isUpdating,
  onToggleWrite,
  onAccept,
  onDismiss,
  onComplete,
}: ImproveCardContentProps) {
  const writeOpen = activeCardId === card.id && ctaExpanded;

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-accent-green text-xs font-heading tracking-widest uppercase mb-1">
            {card.lens}
          </p>
          <p className="font-heading text-base font-medium text-base-text">{card.title}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-base-muted text-xs font-heading">{card.domainLabel}</span>
          <p className="text-base-muted text-[11px] mt-1">{card.phaseLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="rounded border border-base-border px-2 py-1 text-[11px] text-base-subtext font-heading uppercase tracking-wider">
          {STATUS_LABELS[card.status]}
        </span>
        {card.xpReward > 0 && (
          <span className="text-accent-green text-[11px] font-heading">+{card.xpReward} XP</span>
        )}
      </div>

      <p className="text-base-subtext text-sm mb-3">{card.body}</p>
      <p className="text-base-text text-sm mb-4">{card.actionText}</p>

      {writeOpen && card.cta && card.cta in CTA_PROMPTS && (
        <textarea
          className="input-field w-full h-20 resize-none text-sm mb-3"
          placeholder={CTA_PROMPTS[card.cta as keyof typeof CTA_PROMPTS]}
          // biome-ignore lint/a11y/noAutofocus: textarea is primary focus after opening reflection
          autoFocus
        />
      )}

      {card.status === 'completed' ? (
        <p className="text-accent-green text-xs">
          Complete{rewarded && card.xpReward > 0 ? `. ${card.xpReward} XP awarded.` : '.'}
        </p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {card.status === 'new' && (
            <Button size="sm" onClick={onAccept} disabled={isUpdating}>
              Accept
            </Button>
          )}
          {card.cta && card.cta !== 'check_in_now' && card.status === 'accepted' && (
            <Button size="sm" variant="ghost" onClick={onToggleWrite}>
              {card.cta === 'reflect' ? 'Write' : 'Plan'}
            </Button>
          )}
          {card.status === 'accepted' && (
            <Button size="sm" onClick={onComplete} disabled={isUpdating}>
              Mark complete
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss} disabled={isUpdating}>
            Dismiss
          </Button>
        </div>
      )}
    </>
  );
}

export default function ImproveScreen() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const authUser = useAppStore((s) => s.authUser);
  const currentCycle = useAppStore((s) => s.currentCycle);
  const domainFocuses = useAppStore((s) => s.domainFocuses);
  const customRoutes = useAppStore((s) => s.customRoutes);
  const todayCheckIns = useAppStore((s) => s.todayCheckIns);
  const todayCustomRouteCheckIns = useAppStore((s) => s.todayCustomRouteCheckIns);
  const improveCardStatuses = useAppStore((s) => s.improveCardStatuses);
  const improveCardSnapshots = useAppStore((s) => s.improveCardSnapshots);
  const rewardedImproveCards = useAppStore((s) => s.rewardedImproveCards);
  const setDailyCheckIn = useAppStore((s) => s.setDailyCheckIn);
  const setCustomRouteCheckIn = useAppStore((s) => s.setCustomRouteCheckIn);
  const setImproveCardStatus = useAppStore((s) => s.setImproveCardStatus);

  const isPaidTier = hasBrotherhoodAccess(profile?.tier);
  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const isSunday = now.getDay() === 0;
  const canSeeNudge = isPaidTier || isSunday;
  const locked = !isPaidTier && !isSunday;
  const dayInCycle = currentCycle ? getDayInCycle(currentCycle.startDate) : 1;
  const phaseConfig = getCurrentPhaseConfig(dayInCycle);

  const { data: nudge, isLoading, isError, refetch } = useNudge();
  const { mutate: updateStatus, isPending: isUpdatingNudge } = useUpdateNudgeStatus();

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [ctaExpanded, setCtaExpanded] = useState(false);

  const frameworkRecommendations = buildFrameworkRecommendations({
    email: authUser?.email,
    domainFocuses,
    todayCheckIns,
    customRoutes: isPaidTier ? customRoutes : [],
    todayCustomRouteCheckIns,
  });

  const aiCard: ImproveCard | null =
    canSeeNudge && nudge && nudge.status !== 'dismissed'
      ? {
          id: nudge.id,
          kind: 'ai',
          status: nudge.status,
          lens: nudge.type === 'weekly_challenge' ? 'Challenge' : "Today's nudge",
          title: nudge.title,
          body: nudge.body,
          domainLabel: nudge.domainType ?? 'Kairos',
          phaseLabel: nudge.kairosPhase ?? phaseConfig.label,
          actionText:
            nudge.cta === 'reflect'
              ? 'Write one honest line'
              : nudge.cta === 'plan_tomorrow'
                ? 'Plan tomorrow'
                : 'Close one loop',
          xpReward: nudge.xpReward ?? 0,
          cta: nudge.cta,
          nudge,
        }
      : null;

  const frameworkCards: ImproveCard[] = frameworkRecommendations.map((recommendation) => {
    const id = `${todayIso}:framework:${recommendation.id}`;
    return {
      id,
      kind: 'framework',
      status: (improveCardStatuses[id] as NudgeStatus | undefined) ?? 'new',
      lens: recommendation.lens,
      title: recommendation.title,
      body: recommendation.body,
      domainLabel: recommendation.domainLabel,
      phaseLabel: phaseConfig.label,
      actionText: recommendation.actionText,
      xpReward: recommendation.lens === 'Reflect' ? 5 : 15,
      cta: recommendation.lens === 'Reflect' ? 'reflect' : 'check_in_now',
      domainType: recommendation.domainType,
      customRouteId: recommendation.customRouteId,
    };
  });

  const currentCardIds = new Set([aiCard?.id, ...frameworkCards.map((card) => card.id)]);
  const snapshotCards: ImproveCard[] = Object.values(improveCardSnapshots)
    .filter((snapshot) => !currentCardIds.has(snapshot.id))
    .map((snapshot) => ({
      ...snapshot,
      kind: 'framework',
      status: (improveCardStatuses[snapshot.id] as NudgeStatus | undefined) ?? 'new',
    }));

  const visibleCards = [aiCard, ...frameworkCards, ...snapshotCards]
    .filter((card): card is ImproveCard => Boolean(card))
    .filter((card) => card.status !== 'dismissed');
  const activeCards = visibleCards.filter((card) => card.status === 'accepted').slice(0, 3);
  const nextCards = visibleCards
    .filter((card) => card.status === 'new')
    .slice(0, Math.max(0, 3 - activeCards.length));
  const completedCards = visibleCards.filter((card) => card.status === 'completed').slice(0, 2);

  function setCardStatus(card: ImproveCard, status: NudgeStatus) {
    if (card.kind === 'ai' && card.nudge) {
      updateStatus({ nudgeId: card.nudge.id, status, xpReward: card.nudge.xpReward });
      return;
    }

    if (status === 'accepted' || status === 'completed' || status === 'dismissed') {
      void setImproveCardStatus(card.id, status, card.xpReward, toSnapshot(card));
    }
  }

  function completeCard(card: ImproveCard) {
    if (card.kind === 'framework' && card.cta !== 'reflect') {
      if (card.customRouteId) {
        void setCustomRouteCheckIn(card.customRouteId, 'Done');
      } else if (card.domainType) {
        void setDailyCheckIn(card.domainType, 'Done');
      }
    }
    setCardStatus(card, 'completed');
    setCtaExpanded(false);
  }

  function renderCard(card: ImproveCard, emphasise = false) {
    return (
      <Card key={card.id} className={emphasise ? 'border-accent-green/40' : ''}>
        <ImproveCardContent
          card={card}
          activeCardId={activeCardId}
          ctaExpanded={ctaExpanded}
          rewarded={!!rewardedImproveCards[card.id]}
          isUpdating={isUpdatingNudge && card.kind === 'ai'}
          onToggleWrite={() => {
            setActiveCardId((current) => (current === card.id ? null : card.id));
            setCtaExpanded((current) => (activeCardId === card.id ? !current : true));
          }}
          onAccept={() => setCardStatus(card, 'accepted')}
          onDismiss={() => setCardStatus(card, 'dismissed')}
          onComplete={() => completeCard(card)}
        />
      </Card>
    );
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
            aria-label="Refresh Improve card"
          >
            <Zap size={18} />
          </button>
        )}
      </div>

      {locked ? (
        <Card className="relative overflow-hidden">
          <div className="blur-sm pointer-events-none select-none">
            <p className="font-heading text-base font-medium text-base-text mb-1">
              Active challenge
            </p>
            <p className="text-base-subtext text-sm mb-3">
              Phase-aware, domain-specific prompts built from your current 12K context.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 rounded border border-base-border bg-base-black/20" />
              <div className="h-16 rounded border border-base-border bg-base-black/20" />
              <div className="h-16 rounded border border-base-border bg-base-black/20" />
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-surface/85 p-4 text-center">
            <p className="font-heading font-medium text-base-text text-sm mb-3">
              Improve cards are a Brotherhood feature.
            </p>
            <Button size="sm" onClick={() => navigate('/subscription')}>
              Unlock Brotherhood, {SUBSCRIPTION_COPY.price}/mo
            </Button>
            <p className="text-base-muted text-xs mt-3">Free tier gets one nudge on Sundays.</p>
          </div>
        </Card>
      ) : (
        <>
          {canSeeNudge && isLoading && (
            <Card>
              <p className="text-base-subtext text-sm">Generating your card...</p>
            </Card>
          )}

          {canSeeNudge && isError && !isLoading && (
            <Card>
              <p className="text-status-partial text-sm">
                AI generation is unavailable, so the framework options below are carrying today.
              </p>
            </Card>
          )}

          {canSeeNudge && !nudge && !isLoading && !isError && (
            <Card>
              <p className="text-base-subtext text-sm mb-3">
                No AI card yet today. Generate one or use the framework options below.
              </p>
              <Button size="sm" onClick={() => refetch()}>
                Generate card
              </Button>
            </Card>
          )}

          {activeCards.length > 0 && (
            <div>
              <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
                Active
              </h2>
              <div className="flex flex-col gap-3">
                {activeCards.map((card) => renderCard(card, true))}
              </div>
            </div>
          )}

          {nextCards.length > 0 && (
            <div>
              <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
                Next options
              </h2>
              <div className="flex flex-col gap-3">{nextCards.map((card) => renderCard(card))}</div>
            </div>
          )}

          {completedCards.length > 0 && (
            <div>
              <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
                Completed today
              </h2>
              <div className="flex flex-col gap-3">
                {completedCards.map((card) => renderCard(card, true))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function toSnapshot(card: ImproveCard): ImproveCardSnapshot {
  return {
    id: card.id,
    lens: card.lens,
    title: card.title,
    body: card.body,
    domainLabel: card.domainLabel,
    phaseLabel: card.phaseLabel,
    actionText: card.actionText,
    xpReward: card.xpReward,
    cta: card.cta,
    domainType: card.domainType,
    customRouteId: card.customRouteId,
  };
}
