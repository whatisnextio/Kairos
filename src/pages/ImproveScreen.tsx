import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useNudge, useUpdateNudgeStatus } from '@/hooks/useNudge';
import { useAppStore } from '@/store/useAppStore';
import type { AiNudge, DomainType, ImproveCardSnapshot, NudgeCta, NudgeStatus } from '@/types';
import { getDomainConfig } from '@/types';
import {
  type FrameworkRecommendation,
  buildFrameworkRecommendations,
} from '@/utils/frameworkRecommendations';
import { formatKairosPoints } from '@/utils/gamification';
import {
  getDismissedCardsMessage,
  getImproveStatusHelper,
  normaliseNudgeErrorMessage,
  resolveImproveCompletionTarget,
} from '@/utils/improveLifecycle';
import { getCurrentPhaseConfig, getDayInCycle } from '@/utils/kairos';
import { LOCAL_FALLBACK_NUDGE_ID_PREFIX } from '@/utils/nudgeFallback';
import { toLocalIsoDate } from '@/utils/v1Framework';
import { Zap } from 'lucide-react';
import { useState } from 'react';

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

const AI_BOUNDARY_COPY =
  'Kairos coaching only. Not therapy, diagnosis, medical, legal, or financial advice.';

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
  whyText: string;
  xpReward: number;
  cta: NudgeCta;
  reflectionText?: string;
  nudge?: AiNudge;
  domainType?: DomainType;
  customRouteId?: string;
}

function buildAiWhyText(nudge: AiNudge, domainLabel: string, phaseLabel: string): string {
  const ctaContext =
    nudge.cta === 'check_in_now'
      ? "today's check-in path"
      : nudge.cta === 'reflect'
        ? 'a reflection prompt'
        : nudge.cta === 'plan_tomorrow'
          ? "tomorrow's plan"
          : 'one next action';
  const domainContext = domainLabel === 'Kairos' ? 'your current 12K context' : domainLabel;

  return `Based on your ${phaseLabel} phase, ${domainContext}, ${ctaContext}, and available Kairos history such as recent check-ins, streaks, vibe checks, and active extra actions.`;
}

function buildFallbackWhyText(domainLabel: string, phaseLabel: string): string {
  const domainContext = domainLabel === 'Kairos' ? 'your current 12K setup' : domainLabel;
  return `Built from your ${phaseLabel} phase and ${domainContext} setup while the AI service is unavailable. Retry AI when the service is back.`;
}

function getNudgeDomainLabel(domainType: DomainType | null, email?: string | null): string {
  if (!domainType) return 'Kairos';
  return getDomainConfig(domainType, email)?.label ?? domainType;
}

function buildFrameworkWhyText(
  recommendation: FrameworkRecommendation,
  phaseLabel: string,
): string {
  const routeContext = recommendation.customRouteId
    ? 'your extra action'
    : `${recommendation.domainLabel} setup`;

  return `Based on your ${phaseLabel} phase, ${routeContext}, today's check-in state, and the next useful option in the Kairos framework.`;
}

function buildSnapshotWhyText(snapshot: ImproveCardSnapshot): string {
  return `Saved from ${snapshot.phaseLabel} for ${snapshot.domainLabel}. It stays visible from the original Improve context until you complete or dismiss it.`;
}

interface ImproveCardContentProps {
  card: ImproveCard;
  activeCardId: string | null;
  ctaExpanded: boolean;
  rewarded: boolean;
  isUpdating: boolean;
  reflectionText: string;
  onReflectionChange: (text: string) => void;
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
  reflectionText,
  onReflectionChange,
  onToggleWrite,
  onAccept,
  onDismiss,
  onComplete,
}: ImproveCardContentProps) {
  const writeOpen = activeCardId === card.id && ctaExpanded;

  return (
    <>
      <div className="mb-4 rounded border border-accent-green/30 bg-accent-green/10 px-3 py-3">
        <p className="mb-1 font-heading text-[11px] uppercase tracking-widest text-accent-green">
          Action
        </p>
        <p className="font-heading text-lg font-semibold leading-snug text-base-text sm:text-xl">
          {card.actionText}
        </p>
      </div>

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
          <span className="text-accent-green text-[11px] font-heading">
            +{formatKairosPoints(card.xpReward)}
          </span>
        )}
      </div>

      <div className="mb-3">
        <p className="mb-1 font-heading text-[11px] uppercase tracking-widest text-base-muted">
          Context
        </p>
        <p className="text-base-subtext text-sm">{card.body}</p>
      </div>
      <details className="mb-3 rounded border border-base-border bg-base-black/20 px-3 py-2">
        <summary className="cursor-pointer text-base-subtext text-xs font-heading tracking-widest uppercase">
          Why this?
        </summary>
        <p className="mt-2 text-base-subtext text-xs leading-relaxed">{card.whyText}</p>
        <p className="mt-2 text-base-muted text-[11px] leading-relaxed">{AI_BOUNDARY_COPY}</p>
      </details>
      <p className="text-base-muted text-xs mb-4">{getImproveStatusHelper(card.status)}</p>

      {writeOpen && card.cta && card.cta in CTA_PROMPTS && (
        <textarea
          className="input-field w-full h-20 resize-none text-sm mb-3"
          placeholder={CTA_PROMPTS[card.cta as keyof typeof CTA_PROMPTS]}
          value={reflectionText}
          onChange={(e) => onReflectionChange(e.target.value)}
          // biome-ignore lint/a11y/noAutofocus: textarea is primary focus after opening reflection
          autoFocus
        />
      )}

      {card.status === 'completed' ? (
        <div className="flex flex-col gap-2">
          <p className="text-accent-green text-xs">
            Complete
            {rewarded && card.xpReward > 0
              ? `. ${formatKairosPoints(card.xpReward)} awarded.`
              : '.'}
          </p>
          {card.reflectionText && (
            <p className="rounded border border-base-border bg-base-black/20 p-2 text-xs text-base-subtext">
              {card.reflectionText}
            </p>
          )}
        </div>
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
              Done
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

  const now = new Date();
  const todayIso = toLocalIsoDate(now);
  const canSeeNudge = !!profile;
  const dayInCycle = currentCycle ? getDayInCycle(currentCycle.startDate) : 1;
  const phaseConfig = getCurrentPhaseConfig(dayInCycle);

  const { data: nudge, isLoading, isFetching, isError, error: nudgeError, refetch } = useNudge();
  const { mutate: updateStatus, isPending: isUpdatingNudge } = useUpdateNudgeStatus();
  const isFallbackNudge = nudge?.id.startsWith(LOCAL_FALLBACK_NUDGE_ID_PREFIX) ?? false;

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [ctaExpanded, setCtaExpanded] = useState(false);
  const [reflectionDrafts, setReflectionDrafts] = useState<Record<string, string>>({});
  const [showHiddenCards, setShowHiddenCards] = useState(false);

  const frameworkRecommendations = buildFrameworkRecommendations({
    email: authUser?.email,
    domainFocuses,
    todayCheckIns,
    customRoutes,
    todayCustomRouteCheckIns,
  });

  const aiCard: ImproveCard | null =
    canSeeNudge && nudge
      ? {
          id: nudge.id,
          kind: 'ai',
          status: nudge.status,
          lens: isFallbackNudge
            ? 'Kairos fallback'
            : nudge.type === 'weekly_challenge'
              ? 'Challenge'
              : "Today's nudge",
          title: nudge.title,
          body: nudge.body,
          domainLabel: getNudgeDomainLabel(nudge.domainType, authUser?.email),
          phaseLabel: nudge.kairosPhase ?? phaseConfig.label,
          whyText: isFallbackNudge
            ? buildFallbackWhyText(
                getNudgeDomainLabel(nudge.domainType, authUser?.email),
                nudge.kairosPhase ?? phaseConfig.label,
              )
            : buildAiWhyText(
                nudge,
                getNudgeDomainLabel(nudge.domainType, authUser?.email),
                nudge.kairosPhase ?? phaseConfig.label,
              ),
          actionText:
            nudge.cta === 'reflect'
              ? 'Write one honest line'
              : nudge.cta === 'plan_tomorrow'
                ? 'Plan tomorrow'
                : 'Close one loop',
          xpReward: nudge.xpReward ?? 0,
          cta: nudge.cta,
          reflectionText: improveCardSnapshots[nudge.id]?.reflectionText,
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
      whyText: buildFrameworkWhyText(recommendation, phaseConfig.label),
      actionText: recommendation.actionText,
      xpReward: recommendation.lens === 'Reflect' ? 5 : 15,
      cta: recommendation.lens === 'Reflect' ? 'reflect' : 'check_in_now',
      reflectionText: improveCardSnapshots[id]?.reflectionText,
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
      whyText: snapshot.whyText ?? buildSnapshotWhyText(snapshot),
    }));

  const allCards = [aiCard, ...frameworkCards, ...snapshotCards].filter(
    (card): card is ImproveCard => Boolean(card),
  );
  const dismissedCards = allCards.filter((card) => card.status === 'dismissed');
  const visibleCards = allCards.filter((card) => card.status !== 'dismissed');
  const activeCards = visibleCards.filter((card) => card.status === 'accepted').slice(0, 3);
  const nextCards = visibleCards
    .filter((card) => card.status === 'new')
    .slice(0, Math.max(0, 3 - activeCards.length));
  const completedCards = visibleCards.filter((card) => card.status === 'completed').slice(0, 2);

  function clearReflectionDraft(cardId: string) {
    setReflectionDrafts((drafts) => {
      const { [cardId]: _removed, ...remaining } = drafts;
      return remaining;
    });
  }

  function setCardStatus(card: ImproveCard, status: NudgeStatus, reflectionText?: string) {
    const snapshot = toSnapshot(card, reflectionText);

    if (card.kind === 'ai' && card.nudge) {
      updateStatus({ nudgeId: card.nudge.id, status, xpReward: card.nudge.xpReward });
      void setImproveCardStatus(card.id, status, 0, snapshot);
      return;
    }

    void setImproveCardStatus(card.id, status, card.xpReward, snapshot);
  }

  function restoreCard(card: ImproveCard) {
    setCardStatus(card, 'new');
    clearReflectionDraft(card.id);
    setActiveCardId((current) => (current === card.id ? null : current));
    setCtaExpanded(false);
  }

  function completeCard(card: ImproveCard) {
    const reflectionText = (reflectionDrafts[card.id] ?? '').trim();

    if (card.cta !== 'reflect') {
      const target = resolveImproveCompletionTarget({
        domainType: card.domainType,
        customRouteId: card.customRouteId,
        customRoutes,
      });

      if (target.kind === 'custom') {
        void setCustomRouteCheckIn(target.routeId, 'Done');
      } else if (target.kind === 'core') {
        void setDailyCheckIn(target.domainType, 'Done');
      }
    }
    setCardStatus(card, 'completed', reflectionText || undefined);
    setCtaExpanded(false);
    clearReflectionDraft(card.id);
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
          reflectionText={
            activeCardId === card.id ? (reflectionDrafts[card.id] ?? card.reflectionText ?? '') : ''
          }
          onReflectionChange={(text) =>
            setReflectionDrafts((drafts) => ({ ...drafts, [card.id]: text }))
          }
          onToggleWrite={() => {
            setActiveCardId((current) => (current === card.id ? null : card.id));
            setCtaExpanded((current) => (activeCardId === card.id ? !current : true));
          }}
          onAccept={() => setCardStatus(card, 'accepted')}
          onDismiss={() => {
            setCardStatus(card, 'dismissed');
            clearReflectionDraft(card.id);
          }}
          onComplete={() => completeCard(card)}
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">Improve</h1>
          <p className="mt-1 max-w-xl text-sm text-base-subtext">
            AI acts as a Kairos accountability coach for short prompts, not chat.
          </p>
        </div>
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

      {canSeeNudge && isLoading && (
        <Card>
          <p className="font-heading text-sm font-medium text-base-text mb-1">
            Generating your coach card
          </p>
          <p className="text-base-subtext text-sm">
            Using your phase, focus, recent proof, and active extra actions.
          </p>
        </Card>
      )}

      {canSeeNudge && isError && !isLoading && (
        <Card>
          <p className="font-heading text-sm font-medium text-status-partial mb-1">
            Coach card not ready
          </p>
          <p className="text-base-subtext text-sm mb-3">{normaliseNudgeErrorMessage(nudgeError)}</p>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Retrying...' : 'Retry coach card'}
          </Button>
        </Card>
      )}

      {canSeeNudge && isFallbackNudge && !isLoading && !isError && (
        <Card>
          <p className="font-heading text-sm font-medium text-status-partial mb-1">
            Coach card not ready
          </p>
          <p className="text-base-subtext text-sm mb-3">
            The card below is a Kairos fallback from your setup. Retry AI when you want the
            generated card.
          </p>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Retrying...' : 'Retry coach card'}
          </Button>
        </Card>
      )}

      {canSeeNudge && !nudge && !isLoading && !isError && (
        <Card>
          <p className="text-base-subtext text-sm mb-3">
            No coach card yet today. Generate one, or choose a Kairos option below.
          </p>
          <Button size="sm" onClick={() => refetch()}>
            {isFetching ? 'Generating...' : 'Generate coach card'}
          </Button>
        </Card>
      )}

      {dismissedCards.length > 0 && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-2">
                Hidden today
              </p>
              <p className="text-base-subtext text-sm">
                {getDismissedCardsMessage(dismissedCards.length)}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowHiddenCards((open) => !open)}>
              {showHiddenCards ? 'Hide' : 'Show'}
            </Button>
          </div>
          {showHiddenCards && (
            <div className="mt-4 divide-y divide-base-border border-t border-base-border">
              {dismissedCards.map((card) => (
                <div
                  key={`hidden:${card.id}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-accent-green text-[11px] font-heading uppercase tracking-widest">
                      {card.lens}
                    </p>
                    <p className="truncate font-heading text-sm text-base-text">{card.title}</p>
                    <p className="text-xs text-base-muted">
                      {card.domainLabel} - {card.phaseLabel}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => restoreCard(card)}
                    disabled={isUpdatingNudge && card.kind === 'ai'}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
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
    </div>
  );
}

function toSnapshot(card: ImproveCard, reflectionText?: string): ImproveCardSnapshot {
  return {
    id: card.id,
    lens: card.lens,
    title: card.title,
    body: card.body,
    domainLabel: card.domainLabel,
    phaseLabel: card.phaseLabel,
    actionText: card.actionText,
    whyText: card.whyText,
    xpReward: card.xpReward,
    cta: card.cta,
    reflectionText,
    domainType: card.domainType,
    customRouteId: card.customRouteId,
  };
}
