import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Day84CompletionModal from '@/components/modals/Day84CompletionModal';
import { useCycleReflection } from '@/hooks/useCycleReflection';
import { useStreaks } from '@/hooks/useStreaks';
import { useAppStore } from '@/store/useAppStore';
import type { KairosPhaseConfig } from '@/types';
import { KAIROS_CYCLE_LENGTH_DAYS, getAvailableDomains, getDomainRouteSlug } from '@/types';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import {
  POINTS_FULL_LABEL,
  deriveEarnedBadges,
  formatKairosPoints,
  getLevelForXp,
  getXpProgressInLevel,
} from '@/utils/gamification';
import { KAIROS_PHASES, getCurrentPhaseConfig, getDayInCycle } from '@/utils/kairos';
import { buildProgressSharePreview, shareOrCopyProgress } from '@/utils/shareProgress';
import { buildWeeklyFlywheel, getDailyDomainLabel, toLocalIsoDate } from '@/utils/v1Framework';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_DOT: Record<string, string> = {
  Done: 'bg-status-done',
  Partial: 'bg-status-partial',
  Missed: 'bg-status-missed',
  Pending: 'bg-base-border',
  Protected: 'bg-base-muted',
};

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    days.push(toLocalIsoDate(d));
  }
  return days;
}

export default function ProgressScreen() {
  const navigate = useNavigate();
  const [showDay84Modal, setShowDay84Modal] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const {
    profile,
    authUser,
    currentCycle,
    todayCheckIns,
    todayCustomRouteCheckIns,
    checkInHistory,
    customRoutes,
    customRouteCheckInHistory,
    rewardedImproveCards,
    streakProtectionHistory,
    awardedWeeklyBonuses,
    streaks: localStreaks,
    profileImageDataUrl,
    sharePrivacyPreferences,
  } = useAppStore();
  const { data: remoteStreaks } = useStreaks();

  // Compute before early return so hooks are never called conditionally.
  const dayInCycle = profile && currentCycle ? getDayInCycle(currentCycle.startDate) : 0;
  const cycleComplete = dayInCycle >= KAIROS_CYCLE_LENGTH_DAYS;
  const { data: aiReflection } = useCycleReflection(
    cycleComplete && hasBrotherhoodAccess(profile?.tier),
  );

  if (!profile || !currentCycle) return null;
  const currentPhase = getCurrentPhaseConfig(dayInCycle);
  const availableDomains = getAvailableDomains(authUser?.email);
  const domainLabels = new Map(availableDomains.map((domain) => [domain.type, domain.label]));
  const activeCustomRoutes = customRoutes.filter((route) => !route.archivedAt);
  const level = getLevelForXp(profile.xp);
  const xpProgress = getXpProgressInLevel(profile.xp);
  const hasPaidAccess = hasBrotherhoodAccess(profile.tier);
  const last7 = getLast7Days();
  const today = toLocalIsoDate(new Date());
  const flywheel = buildWeeklyFlywheel({
    email: authUser?.email,
    checkInHistory,
    todayCheckIns,
  });
  const badges = deriveEarnedBadges({
    profile,
    checkInHistory,
    todayCheckIns,
    rewardedImproveCards,
    streakProtectionHistory,
    awardedWeeklyBonuses,
    dayInCycle,
  });
  const earnedBadges = badges.filter((badge) => badge.earned);
  const unearnedBadges = badges.filter((badge) => !badge.earned);
  const sharePreview = buildProgressSharePreview({
    displayName: profile.displayName,
    dayInCycle,
    xp: profile.xp,
    levelLabel: `Level ${level.level}: ${level.label}`,
    earnedBadgeLabel: earnedBadges[0]?.label,
    flywheel,
    preferences: sharePrivacyPreferences,
    profileImageDataUrl,
  });

  async function handleShareProgress() {
    setShareStatus(null);
    try {
      const result = await shareOrCopyProgress(sharePreview);
      if (result === 'shared') setShareStatus('Shared from your device.');
      if (result === 'copied') setShareStatus('Copied. Paste it wherever you choose.');
      if (result === 'cancelled') setShareStatus('Share cancelled. Nothing left the app.');
      if (result === 'unsupported') setShareStatus('Copy the preview text manually.');
    } catch {
      setShareStatus('Sharing failed. Copy the preview text manually.');
    }
  }

  return (
    <>
      {showDay84Modal && <Day84CompletionModal onClose={() => setShowDay84Modal(false)} />}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
        <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">Progress</h1>

        {/* Cycle-complete banner */}
        {cycleComplete && (
          <div className="rounded-xl border border-accent-green/40 bg-accent-green/5 px-4 py-5">
            <p className="font-heading text-xs text-accent-green tracking-widest uppercase mb-1">
              Cycle complete
            </p>
            <h2 className="font-heading text-xl font-bold text-base-text tracking-wide mb-3">
              {KAIROS_CYCLE_LENGTH_DAYS} days done.
            </h2>
            <div className="flex gap-4 mb-4">
              <div>
                <p className="font-heading font-bold text-base-text">
                  {formatKairosPoints(currentCycle.totalXpEarned ?? profile.xp)}
                </p>
                <p className="text-base-muted text-xs">KP earned</p>
              </div>
              {aiReflection?.stats && (
                <>
                  <div>
                    <p className="font-heading font-bold text-base-text">
                      {aiReflection.stats.totalCheckIns}
                    </p>
                    <p className="text-base-muted text-xs">check-ins</p>
                  </div>
                  <div>
                    <p className="font-heading font-bold text-base-text">
                      {aiReflection.stats.overallCompletionRate}%
                    </p>
                    <p className="text-base-muted text-xs">completion</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {hasBrotherhoodAccess(profile.tier) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDay84Modal(true)}
                  type="button"
                >
                  View reflection
                </Button>
              )}
              <Button size="sm" onClick={() => navigate('/new-cycle')} type="button">
                Start Cycle 2
              </Button>
            </div>
          </div>
        )}

        {hasPaidAccess ? (
          <Card>
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
              Status
            </p>
            <p className="font-heading text-xl font-bold text-base-text">
              Level {level.level}: {level.label}
            </p>
            <p className="text-base-subtext text-xs mt-1">{formatKairosPoints(profile.xp)} total</p>
            <div className="mt-3 h-1.5 bg-base-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-green rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded border border-base-border p-2">
                <p className="font-heading text-base-text text-sm">
                  {Object.keys(streakProtectionHistory).length}
                </p>
                <p className="text-base-muted text-[11px]">protection used</p>
              </div>
              <div className="rounded border border-base-border p-2">
                <p className="font-heading text-base-text text-sm">
                  {Object.keys(awardedWeeklyBonuses).length}
                </p>
                <p className="text-base-muted text-[11px]">weekly bonuses</p>
              </div>
            </div>
            <p className="text-base-muted text-xs mt-2">
              {level.level < 10
                ? `${xpProgress}% to Level ${level.level + 1}`
                : 'Max level reached'}
            </p>
          </Card>
        ) : (
          <Card>
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
              Basic progress
            </p>
            <p className="font-heading text-xl font-bold text-base-text">No KP on Free</p>
            <p className="text-base-subtext text-xs mt-1">
              Free keeps your visual check-in history on this device. Status, {POINTS_FULL_LABEL},
              streak protection, weekly bonuses, and badges unlock with Kairos Plus.
            </p>
          </Card>
        )}

        {activeCustomRoutes.length > 0 && (
          <Card>
            <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
              Personal sub-routes
            </h2>
            <p className="text-base-muted text-xs mb-3">
              Tracked under the core categories, not as separate domains.
            </p>
            <div className="flex flex-col gap-3">
              {activeCustomRoutes.map((route) => {
                let done = 0;
                let partial = 0;
                let missed = 0;
                let score = 0;

                for (const date of last7) {
                  const status =
                    date === today
                      ? (todayCustomRouteCheckIns[route.id]?.status ??
                        customRouteCheckInHistory[date]?.[route.id])
                      : customRouteCheckInHistory[date]?.[route.id];
                  if (status === 'Done') done += 1;
                  if (status === 'Partial' || status === 'Protected') partial += 1;
                  if (status === 'Missed') missed += 1;
                  if (status === 'Done') score += 1;
                  if (status === 'Partial' || status === 'Protected') score += 0.5;
                }

                const pct = Math.round((score / last7.length) * 100);
                return (
                  <div key={route.id} className="border-b border-base-border pb-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-heading text-sm font-medium text-base-text truncate">
                          {route.label}
                        </p>
                        <p className="text-base-muted text-[11px] mt-0.5">
                          Under {domainLabels.get(route.parentDomainType) ?? 'Kairos'}
                        </p>
                      </div>
                      <p
                        className={`font-heading text-sm font-bold ${
                          pct >= 70
                            ? 'text-status-done'
                            : pct >= 40
                              ? 'text-status-partial'
                              : 'text-status-missed'
                        }`}
                      >
                        {pct}%
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-1">
                      {last7.map((date) => {
                        const status =
                          date === today
                            ? (todayCustomRouteCheckIns[route.id]?.status ??
                              customRouteCheckInHistory[date]?.[route.id])
                            : customRouteCheckInHistory[date]?.[route.id];
                        const dotClass = status
                          ? (STATUS_DOT[status] ?? 'bg-base-border')
                          : 'bg-base-border/40';
                        return (
                          <div key={date} className="flex justify-center">
                            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-base-muted text-[11px] mt-2">
                      {done} done - {partial} partial - {missed} missed
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
            {flywheel.title}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {flywheel.entries.map((entry) => (
              <button
                key={entry.domainType}
                type="button"
                onClick={() => navigate(`/detail/${getDomainRouteSlug(entry.domainType)}`)}
                className="rounded border border-base-border bg-base-black/20 p-3 text-left hover:border-base-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-heading text-xs font-medium text-base-text truncate">
                    {entry.label}
                  </p>
                  <p
                    className={`font-heading text-sm font-bold ${
                      entry.state === 'steady'
                        ? 'text-status-done'
                        : entry.state === 'thin'
                          ? 'text-status-partial'
                          : 'text-status-missed'
                    }`}
                  >
                    {entry.score}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 bg-base-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      entry.state === 'steady'
                        ? 'bg-status-done'
                        : entry.state === 'thin'
                          ? 'bg-status-partial'
                          : 'bg-status-missed'
                    }`}
                    style={{ width: `${entry.score}%` }}
                  />
                </div>
                <p className="text-base-muted text-[11px] mt-2">
                  {entry.done} done - {entry.partial} partial - {entry.missed} missed
                </p>
              </button>
            ))}
          </div>
        </Card>

        {hasPaidAccess && (
          <Card>
            <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
              Badges
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[...earnedBadges, ...unearnedBadges].map((badge) => (
                <div
                  key={badge.id}
                  className={`rounded border p-3 ${
                    badge.earned
                      ? 'border-accent-green/50 bg-accent-green/5'
                      : 'border-base-border bg-base-black/20 opacity-70'
                  }`}
                >
                  <p className="font-heading text-sm font-medium text-base-text">{badge.label}</p>
                  <p className="text-base-muted text-[11px] mt-1">{badge.description}</p>
                  <p className="text-base-subtext text-[11px] mt-2">
                    {badge.earned ? 'Earned' : 'Unlock'}: {badge.trigger}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {hasPaidAccess && (
          <Card>
            <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-2">
              Controlled share
            </h2>
            <p className="text-base-subtext text-sm mb-3">
              Preview exactly what leaves the app. Private routes and notes stay out unless you
              change your sharing privacy in You.
            </p>

            {!showSharePreview ? (
              <Button size="sm" onClick={() => setShowSharePreview(true)} type="button">
                Preview share
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded border border-base-border bg-base-black/20 p-3">
                  {sharePreview.showPhoto && profileImageDataUrl && (
                    <img
                      src={profileImageDataUrl}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover mb-3"
                    />
                  )}
                  <p className="font-heading text-sm font-medium text-base-text mb-2">
                    {sharePreview.title}
                  </p>
                  <pre className="whitespace-pre-wrap font-body text-sm text-base-subtext leading-relaxed">
                    {sharePreview.text}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleShareProgress} type="button" className="flex-1">
                    Share or copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowSharePreview(false);
                      setShareStatus(null);
                    }}
                    type="button"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
                {shareStatus && <p className="text-base-muted text-xs">{shareStatus}</p>}
              </div>
            )}
          </Card>
        )}

        {/* 7-day domain grid */}
        <Card>
          <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
            Last 7 days
          </h2>

          {/* Day headers */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-2">
            <div />
            {last7.map((date) => {
              const d = new Date(`${date}T00:00:00`);
              const label = d.toLocaleDateString('en-GB', { weekday: 'narrow' });
              const isToday = date === today;
              return (
                <div key={date} className="text-center">
                  <span
                    className={`text-xs ${isToday ? 'text-accent-green font-medium' : 'text-base-muted'}`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Domain rows: pulled from local checkInHistory (all tiers) */}
          {availableDomains.map((d) => (
            <div
              key={d.type}
              className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1.5 items-center"
            >
              <span className={`text-xs font-heading font-medium ${d.colour}`}>
                {getDailyDomainLabel(d)}
              </span>
              {last7.map((date) => {
                const status =
                  date === today
                    ? (todayCheckIns[d.type]?.status ?? 'Pending')
                    : (checkInHistory[date]?.[d.type] ?? undefined);
                const dotClass = status
                  ? (STATUS_DOT[status] ?? 'bg-base-border')
                  : 'bg-base-border/40';
                return (
                  <div key={date} className="flex justify-center">
                    <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                  </div>
                );
              })}
            </div>
          ))}

          <p className="text-base-muted text-xs mt-3">Last 7 days from local history.</p>
        </Card>

        {/* Domain streaks */}
        <Card>
          <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
            Streaks
          </h2>
          <div className="flex flex-col gap-2">
            {availableDomains.map((d) => {
              const streak = hasPaidAccess
                ? remoteStreaks?.find((s) => s.domainType === d.type)
                : localStreaks[d.type];
              return (
                <div key={d.type} className="flex items-center justify-between">
                  <span className={`text-xs font-heading font-medium ${d.colour}`}>
                    {getDailyDomainLabel(d)}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-heading font-bold text-base-text text-sm">
                        {streak?.currentStreak ?? 0}
                        <span className="text-base-muted font-normal text-xs ml-1">current</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-base-subtext text-xs">
                        {streak?.longestStreak ?? 0}
                        <span className="text-base-muted ml-1">best</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Phase timeline */}
        <Card>
          <h2 className="font-heading text-xs font-medium text-base-subtext tracking-widest uppercase mb-3">
            KAIROS Phases
          </h2>
          <div className="flex flex-col gap-2">
            {KAIROS_PHASES.map((phase: KairosPhaseConfig) => {
              const isActive = phase.phase === currentPhase.phase;
              const isPast = phase.days[1] < dayInCycle;
              return (
                <div
                  key={phase.phase}
                  className={`flex items-center gap-3 p-2 rounded ${
                    isActive ? 'bg-accent-green/10 border border-accent-green/30' : ''
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive ? 'bg-accent-green' : isPast ? 'bg-base-muted' : 'bg-base-border'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-heading text-xs font-medium tracking-wider uppercase ${
                        isActive
                          ? 'text-accent-green'
                          : isPast
                            ? 'text-base-muted'
                            : 'text-base-subtext'
                      }`}
                    >
                      {phase.label}
                    </p>
                    <p className="text-base-muted text-xs">
                      Days {phase.days[0]}-{phase.days[1]}
                    </p>
                  </div>
                  {isPast && <span className="text-base-muted text-xs">Done</span>}
                  {isActive && <span className="text-accent-green text-xs">Active</span>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
