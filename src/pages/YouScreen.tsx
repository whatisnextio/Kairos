import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import AbandonCycleModal from '@/components/modals/AbandonCycleModal';
import WeeklyVibeCheckModal from '@/components/modals/WeeklyVibeCheckModal';
import { useMatchToSquad, useSquadPulse } from '@/hooks/useSquad';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/services/pushNotifications';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { type DomainType, IDENTITY_ANCHORS, getAvailableDomains } from '@/types';
import { getSubscriptionTierLabel, hasBrotherhoodAccess } from '@/utils/entitlements';
import { deriveEarnedBadges, getLevelForXp } from '@/utils/gamification';
import { getDayInCycle } from '@/utils/kairos';
import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const SAVE_PUSH_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-push-subscription`;
const DELETE_ACCOUNT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`;
const STRIPE_PORTAL_URL = import.meta.env.VITE_STRIPE_PORTAL_URL;

async function syncPushPreferences(preferences: Record<string, unknown>): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;
    const res = await fetch(SAVE_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferences }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function registerPush(preferences: Record<string, unknown>): Promise<boolean> {
  try {
    const sub = await subscribeToPush();
    if (!sub) return false;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;
    const res = await fetch(SAVE_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription: sub, preferences }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function YouScreen() {
  const {
    profile,
    authUser,
    currentCycle,
    customRoutes,
    journeyArchive,
    profileImageDataUrl,
    notificationPreferences,
    sharePrivacyPreferences,
    setProfileImageDataUrl,
    setNotificationPreferences,
    setSharePrivacyPreferences,
    addCustomRoute,
    archiveCustomRoute,
    signOut,
  } = useAppStore();
  const { data: squadPulse } = useSquadPulse();
  const { mutate: matchToSquad, isPending: isMatching } = useMatchToSquad();
  const [pushStatus, setPushStatus] = useState<
    'idle' | 'requesting' | 'done' | 'denied' | 'unsupported'
  >('idle');

  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPushStatus('denied');
      return;
    }
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setPushStatus('done');
      }),
    );
  }, []);

  const updateNotificationPreferences = useCallback(
    (preferences: Partial<typeof notificationPreferences>) => {
      const next = { ...notificationPreferences, ...preferences };
      setNotificationPreferences(preferences);
      if (next.webPushEnabled) {
        void syncPushPreferences(next);
      }
    },
    [notificationPreferences, setNotificationPreferences],
  );

  const handleEnableNotifications = useCallback(async () => {
    const next = { ...notificationPreferences, enabled: true, webPushEnabled: true };
    setNotificationPreferences({ enabled: true, webPushEnabled: true });
    if (!isPushSupported()) {
      setNotificationPreferences({ enabled: false, webPushEnabled: false });
      setPushStatus('unsupported');
      return;
    }
    setPushStatus('requesting');
    const ok = await registerPush(next);
    setPushStatus(ok ? 'done' : Notification.permission === 'denied' ? 'denied' : 'idle');
    if (!ok) setNotificationPreferences({ enabled: false, webPushEnabled: false });
  }, [notificationPreferences, setNotificationPreferences]);

  const handleDisableNotifications = useCallback(async () => {
    const next = { ...notificationPreferences, enabled: false, webPushEnabled: false };
    setNotificationPreferences({ enabled: false, webPushEnabled: false });
    if (isPushSupported()) await unsubscribeFromPush();
    await syncPushPreferences(next);
    setPushStatus(isPushSupported() ? 'idle' : 'unsupported');
  }, [notificationPreferences, setNotificationPreferences]);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAbandon, setShowAbandon] = useState(false);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [routeLabel, setRouteLabel] = useState('');
  const [routeFocus, setRouteFocus] = useState('');
  const [routeParent, setRouteParent] = useState<DomainType>('METIME');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const hasPaidAccess = hasBrotherhoodAccess(profile?.tier);
  const availableDomains = getAvailableDomains(authUser?.email);
  const domainLabels = new Map(availableDomains.map((domain) => [domain.type, domain.label]));

  const checkInHistory = useAppStore((s) => s.checkInHistory);
  const customRouteCheckInHistory = useAppStore((s) => s.customRouteCheckInHistory);
  const domainFocuses = useAppStore((s) => s.domainFocuses);
  const lastVibeCheckDate = useAppStore((s) => s.lastVibeCheckDate);
  const todayCheckIns = useAppStore((s) => s.todayCheckIns);
  const rewardedImproveCards = useAppStore((s) => s.rewardedImproveCards);
  const streakProtectionHistory = useAppStore((s) => s.streakProtectionHistory);
  const awardedWeeklyBonuses = useAppStore((s) => s.awardedWeeklyBonuses);

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    let payload: Record<string, unknown>;
    const earnedBadges = profile
      ? deriveEarnedBadges({
          profile,
          checkInHistory,
          todayCheckIns,
          rewardedImproveCards,
          streakProtectionHistory,
          awardedWeeklyBonuses,
          dayInCycle: currentCycle ? getDayInCycle(currentCycle.startDate) : 0,
        }).filter((badge) => badge.earned)
      : [];

    if (profile && hasBrotherhoodAccess(profile.tier)) {
      const { data: checkIns } = await supabase
        .from('daily_check_ins')
        .select('date,domain_type,status,notes,xp_awarded')
        .eq('user_id', profile.id)
        .order('date', { ascending: true });
      const { data: vibeChecks } = await supabase
        .from('vibe_checks')
        .select('date,rating')
        .eq('user_id', profile.id)
        .order('date', { ascending: true });
      const { data: customRouteCheckIns } = await supabase
        .from('custom_route_check_ins')
        .select('route_id,date,status,notes,xp_awarded')
        .eq('user_id', profile.id)
        .order('date', { ascending: true });
      payload = {
        exportedAt: new Date().toISOString(),
        profile: {
          displayName: profile.displayName,
          identityAnchorId: profile.identityAnchorId,
          tier: profile.tier,
          xp: profile.xp,
        },
        domainFocuses: domainFocuses.map((f) => ({
          domainType: f.domainType,
          focusDescription: f.focusDescription,
        })),
        customRoutes,
        journeyArchive,
        earnedBadges,
        streakProtectionHistory,
        awardedWeeklyBonuses,
        sharePrivacyPreferences,
        checkIns: checkIns ?? [],
        customRouteCheckIns: customRouteCheckIns ?? [],
        vibeChecks: vibeChecks ?? [],
      };
    } else {
      payload = {
        exportedAt: new Date().toISOString(),
        profile: {
          displayName: profile?.displayName,
          identityAnchorId: profile?.identityAnchorId,
          tier: profile?.tier,
          xp: profile?.xp,
        },
        domainFocuses: domainFocuses.map((f) => ({
          domainType: f.domainType,
          focusDescription: f.focusDescription,
        })),
        customRoutes,
        journeyArchive,
        earnedBadges,
        sharePrivacyPreferences,
        checkInHistory,
        customRouteCheckInHistory,
      };
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `12k-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  }, [
    profile,
    currentCycle,
    domainFocuses,
    customRoutes,
    journeyArchive,
    checkInHistory,
    customRouteCheckInHistory,
    todayCheckIns,
    rewardedImproveCards,
    streakProtectionHistory,
    awardedWeeklyBonuses,
    sharePrivacyPreferences,
  ]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    setDeleteError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setIsDeleting(false);
      return;
    }
    const res = await fetch(DELETE_ACCOUNT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      signOut();
    } else {
      setDeleteError('Delete failed. Please try again or contact support.');
      setIsDeleting(false);
    }
  }, [signOut]);

  const handleProfileImage = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setProfileImageDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [setProfileImageDataUrl],
  );

  const handleAddCustomRoute = useCallback(async () => {
    setRouteError(null);
    setIsAddingRoute(true);
    const result = await addCustomRoute({
      parentDomainType: routeParent,
      label: routeLabel,
      focusDescription: routeFocus,
    });
    setIsAddingRoute(false);

    if (!result.ok) {
      setRouteError(
        result.reason === 'upgrade'
          ? 'Personal routes are included in Brotherhood and Lifechanger.'
          : 'Route could not be saved. Check the name and focus, then try again.',
      );
      return;
    }

    setRouteLabel('');
    setRouteFocus('');
  }, [addCustomRoute, routeFocus, routeLabel, routeParent]);

  if (!profile) return null;

  const anchor = IDENTITY_ANCHORS.find((a) => a.id === profile.identityAnchorId);
  const level = getLevelForXp(profile.xp);
  const anchorName =
    profile.identityAnchorId === 'custom'
      ? (profile.customAnchorName ?? 'Custom')
      : (anchor?.name ?? 'Unknown');

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">You</h1>

      {/* Profile */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="w-16 h-16 rounded-full bg-base-border overflow-hidden flex items-center justify-center">
              {profileImageDataUrl ? (
                <img src={profileImageDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading font-bold text-xl text-base-subtext">
                  {profile.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <label className="block text-center text-base-muted text-xs underline mt-2 cursor-pointer">
              Change
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleProfileImage}
              />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-bold text-base-text">{profile.displayName}</p>
            <p className="text-accent-green text-sm font-heading tracking-wider mt-0.5">
              {anchorName}
            </p>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-base-subtext text-xs">XP</p>
            <p className="font-heading font-bold text-base-text">{profile.xp}</p>
          </div>
          <div>
            <p className="text-base-subtext text-xs">Level</p>
            <p className="font-heading font-bold text-base-text">
              {level.level}: {level.label}
            </p>
          </div>
        </div>
      </Card>

      {/* Custom routes */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">
          Custom routes
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {customRoutes.filter((route) => !route.archivedAt).length === 0 ? (
            <p className="text-base-muted text-sm">No custom routes active.</p>
          ) : (
            customRoutes
              .filter((route) => !route.archivedAt)
              .map((route) => (
                <div
                  key={route.id}
                  className="flex items-start justify-between gap-3 border-b border-base-border pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-medium text-base-text truncate">
                      {route.label}
                    </p>
                    <p className="text-base-subtext text-xs truncate">{route.focusDescription}</p>
                    <p className="text-base-muted text-[11px] mt-0.5">
                      Under {domainLabels.get(route.parentDomainType) ?? 'Kairos'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-base-muted text-xs underline shrink-0"
                    onClick={() => void archiveCustomRoute(route.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
          )}
        </div>
        {!hasPaidAccess ? (
          <div className="rounded border border-status-partial/40 bg-status-partial/5 p-3">
            <p className="text-base-subtext text-sm mb-3">
              Personal routes sit under the core framework and sync across devices on paid plans.
            </p>
            <Link to="/subscription">
              <Button size="sm">Unlock personal routes</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-base-subtext text-xs font-heading tracking-widest uppercase">
              Core category
              <select
                className="input-field mt-1"
                value={routeParent}
                onChange={(e) => setRouteParent(e.target.value as DomainType)}
              >
                {availableDomains.map((domain) => (
                  <option key={domain.type} value={domain.type}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              className="input-field"
              placeholder="Route name, e.g. Lens"
              value={routeLabel}
              onChange={(e) => setRouteLabel(e.target.value)}
            />
            <textarea
              className="input-field h-20 resize-none"
              placeholder="What does a small win look like?"
              value={routeFocus}
              onChange={(e) => setRouteFocus(e.target.value)}
            />
            {routeError && (
              <p role="alert" className="text-status-missed text-xs">
                {routeError}
              </p>
            )}
            <Button
              size="sm"
              onClick={() => void handleAddCustomRoute()}
              disabled={!routeLabel.trim() || !routeFocus.trim() || isAddingRoute}
            >
              {isAddingRoute ? 'Adding...' : 'Add route'}
            </Button>
          </div>
        )}
      </Card>

      {/* Journey history */}
      {journeyArchive.length > 0 && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">
            Journey history
          </p>
          <div className="flex flex-col gap-3">
            {journeyArchive.slice(0, 3).map((entry) => (
              <div key={entry.id} className="border-b border-base-border pb-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-heading text-sm font-medium text-base-text capitalize">
                    {entry.reason}
                  </p>
                  <p className="text-base-muted text-xs">
                    {new Date(entry.archivedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="text-base-subtext text-xs mt-1">
                  {entry.domainFocuses.length + entry.customRoutes.length} routes kept.
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Squad: paid tiers only */}
      {hasPaidAccess && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Squad
          </p>
          {profile.squadId ? (
            <>
              {squadPulse ? (
                <>
                  <p className="text-base-subtext text-xs mb-1">
                    Week {squadPulse.weekNumber} pulse
                  </p>
                  <p className="text-base-text text-sm italic">{squadPulse.message}</p>
                </>
              ) : (
                <p className="text-base-subtext text-sm">Squad pulse drops on Sundays.</p>
              )}
            </>
          ) : (
            <>
              <p className="text-base-subtext text-sm mb-3">
                You haven't been matched to a squad yet.
              </p>
              <Button size="sm" onClick={() => matchToSquad()} disabled={isMatching}>
                {isMatching ? 'Matching...' : 'Find my squad'}
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Subscription */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Subscription
        </p>
        <p className="font-heading font-medium text-base-text">
          {getSubscriptionTierLabel(profile.tier)}
        </p>
        {profile.tier === 'free' && (
          <>
            <div className="rounded border border-status-partial/40 bg-status-partial/5 p-3 mt-3">
              <p className="font-heading text-xs text-status-partial tracking-widest uppercase mb-1">
                Local data
              </p>
              <p className="text-base-subtext text-xs">
                Free progress lives on this device. Export before clearing browser data or changing
                phone.
              </p>
            </div>
            <Link to="/subscription">
              <Button size="sm" className="mt-3">
                Upgrade to Brotherhood
              </Button>
            </Link>
          </>
        )}
        {hasPaidAccess && (
          <>
            {profile.subscriptionStatus === 'past_due' ? (
              <p className="text-status-missed text-xs mt-1 font-medium">
                Payment failed. Update your payment method to keep paid access.
              </p>
            ) : profile.cancelAtPeriodEnd && profile.currentPeriodEnd ? (
              <p className="text-base-subtext text-xs mt-1">
                Cancels on{' '}
                {new Date(profile.currentPeriodEnd).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                .
              </p>
            ) : (
              <p className="text-base-subtext text-xs mt-1">
                {getSubscriptionTierLabel(profile.tier)} active.
              </p>
            )}
            {STRIPE_PORTAL_URL ? (
              <a
                href={`${STRIPE_PORTAL_URL}?prefilled_email=${encodeURIComponent(authUser?.email ?? '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-base-muted hover:text-base-subtext underline mt-2 inline-block"
              >
                Manage billing
              </a>
            ) : (
              <p className="text-base-muted text-xs mt-2">Billing portal is not configured yet.</p>
            )}
          </>
        )}
      </Card>

      {/* Vibe check */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Weekly check-in
        </p>
        <p className="text-base-subtext text-sm mb-3">
          {lastVibeCheckDate
            ? `Last saved ${new Date(`${lastVibeCheckDate}T00:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}.`
            : 'No weekly check-in saved yet.'}
        </p>
        <Button size="sm" variant="secondary" onClick={() => setShowVibeCheck(true)}>
          Open check-in
        </Button>
      </Card>

      {/* Notifications: paid tiers only */}
      {hasPaidAccess && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Notifications
          </p>
          {pushStatus === 'unsupported' ? (
            <p className="text-base-muted text-sm">
              Web push is not supported here. Install the PWA or use a browser with notification
              support.
            </p>
          ) : pushStatus === 'denied' ? (
            <p className="text-base-muted text-sm">
              Notifications are blocked. Re-enable them in browser settings, then return here.
            </p>
          ) : (
            <>
              <p className="text-base-subtext text-sm mb-4">
                Direct prompts, quiet copy, and no sensitive labels on the lock screen.
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between gap-3 text-sm text-base-text">
                  <span>Reminders</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.enabled}
                    onChange={(e) =>
                      e.target.checked
                        ? void handleEnableNotifications()
                        : void handleDisableNotifications()
                    }
                  />
                </label>
                <label className="text-base-subtext text-xs font-heading tracking-widest uppercase">
                  Intensity
                  <select
                    className="input-field mt-1"
                    value={notificationPreferences.intensity}
                    disabled={!notificationPreferences.enabled}
                    onChange={(e) =>
                      updateNotificationPreferences({
                        intensity: e.target.value as typeof notificationPreferences.intensity,
                      })
                    }
                  >
                    <option value="light">Light</option>
                    <option value="standard">Standard</option>
                    <option value="high">High accountability</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-base-subtext text-xs font-heading tracking-widest uppercase">
                    Start
                    <input
                      className="input-field mt-1"
                      type="time"
                      value={`${String(notificationPreferences.startHour).padStart(2, '0')}:00`}
                      disabled={!notificationPreferences.enabled}
                      onChange={(e) =>
                        updateNotificationPreferences({
                          startHour: Number(e.target.value.split(':')[0]),
                        })
                      }
                    />
                  </label>
                  <label className="text-base-subtext text-xs font-heading tracking-widest uppercase">
                    End
                    <input
                      className="input-field mt-1"
                      type="time"
                      value={`${String(notificationPreferences.endHour).padStart(2, '0')}:00`}
                      disabled={!notificationPreferences.enabled}
                      onChange={(e) =>
                        updateNotificationPreferences({
                          endHour: Number(e.target.value.split(':')[0]),
                        })
                      }
                    />
                  </label>
                </div>
                <label className="flex items-center justify-between gap-3 text-sm text-base-subtext">
                  <span>Early-wake protocol</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.earlyProtocol}
                    disabled={!notificationPreferences.enabled}
                    onChange={(e) =>
                      updateNotificationPreferences({ earlyProtocol: e.target.checked })
                    }
                  />
                </label>
                {pushStatus === 'done' && (
                  <p className="text-accent-green text-xs">Web push is connected.</p>
                )}
                {pushStatus === 'requesting' && (
                  <p className="text-base-muted text-xs">Setting up notifications...</p>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {hasPaidAccess && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Sharing privacy
          </p>
          <p className="text-base-subtext text-sm mb-4">
            Defaults for controlled progress shares. You still preview before anything leaves the
            app.
          </p>
          <div className="flex flex-col gap-3">
            {[
              ['includeName', 'Include display name'],
              ['includePhoto', 'Include profile photo in preview'],
              ['includeDomainDetail', 'Show core domain scores'],
              ['includeStats', 'Show level and XP'],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 text-sm text-base-subtext"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={sharePrivacyPreferences[key as keyof typeof sharePrivacyPreferences]}
                  onChange={(e) =>
                    setSharePrivacyPreferences({
                      [key]: e.target.checked,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">
          Settings
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/privacy"
            className="text-base-subtext text-sm hover:text-base-text transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="text-base-subtext text-sm hover:text-base-text transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            to="/help"
            className="text-base-subtext text-sm hover:text-base-text transition-colors"
          >
            Help and FAQ
          </Link>
        </div>
      </Card>

      <Button variant="secondary" onClick={signOut} className="w-full">
        Sign out
      </Button>

      {/* Cycle reset */}
      <div className="pt-2 border-t border-base-border">
        <button
          type="button"
          onClick={() => setShowAbandon(true)}
          className="text-status-partial text-xs font-heading tracking-wider uppercase w-full text-center"
        >
          Reset 12K journey
        </button>
      </div>

      {/* GDPR data export */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleExportData}
          disabled={isExporting}
          className="text-base-muted text-xs underline w-full text-center disabled:opacity-50"
        >
          {isExporting ? 'Preparing download...' : 'Download my data'}
        </button>
      </div>

      {/* GDPR account deletion */}
      <div className="pt-2">
        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="text-status-missed text-xs font-heading tracking-wider uppercase w-full text-center"
          >
            Delete my account
          </button>
        ) : (
          <Card className="border-status-missed/40">
            <p className="text-base-text text-sm font-heading font-medium mb-1">
              This is permanent.
            </p>
            <p className="text-base-subtext text-xs mb-4">
              All your data will be deleted and cannot be recovered. Your subscription will not be
              automatically cancelled. Cancel that in your billing settings first.
            </p>
            {deleteError && (
              <p role="alert" className="text-status-missed text-xs mb-3">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="flex-1"
              >
                {isDeleting ? 'Deleting...' : 'Delete account'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>

      {showAbandon && <AbandonCycleModal onClose={() => setShowAbandon(false)} />}
      {showVibeCheck && <WeeklyVibeCheckModal onClose={() => setShowVibeCheck(false)} />}
    </div>
  );
}
