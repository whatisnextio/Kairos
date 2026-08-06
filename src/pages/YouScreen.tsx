import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DismissibleTip from '@/components/common/DismissibleTip';
import SetupOptionSections from '@/components/common/SetupOptionSections';
import AbandonCycleModal from '@/components/modals/AbandonCycleModal';
import WeeklyVibeCheckModal from '@/components/modals/WeeklyVibeCheckModal';
import { isSquadFeatureEnabled } from '@/config/features';
import { useMatchToSquad, useSquadPulse } from '@/hooks/useSquad';
import {
  INTENSITY_PREVIEW_COPY,
  REMINDER_INTENSITY_OPTIONS,
  getLocalNotificationDateKey,
} from '@/services/localNotifications';
import { isPushSupported, unsubscribeFromPush } from '@/services/pushNotifications';
import {
  registerPushForCurrentUser,
  syncPushPreferencesForCurrentUser,
} from '@/services/pushSubscription';
import { supabase } from '@/services/supabaseClient';
import { saveUserSettings } from '@/services/userSettings';
import { useAppStore } from '@/store/useAppStore';
import { type DomainType, IDENTITY_ANCHORS, getAvailableDomains } from '@/types';
import { FEATURE_EXPLANATIONS } from '@/utils/brandCopy';
import { hasBrotherhoodAccess } from '@/utils/entitlements';
import { deriveEarnedBadges, formatKairosPoints, getLevelForXp } from '@/utils/gamification';
import { getDayInCycle } from '@/utils/kairos';
import type { SharePrivacyPreferences } from '@/utils/shareProgress';
import type { ThemePreference } from '@/utils/theme';
import { buildDomainSetupOptionModel } from '@/utils/v1Framework';
import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const PROFILE_IMAGE_MAX_BYTES = 300_000;
const PROFILE_IMAGE_MAX_PX = 400;
const PROFILE_IMAGE_MIN_PX = 160;
const PROFILE_IMAGE_MIN_QUALITY = 0.44;
const PROFILE_IMAGE_START_QUALITY = 0.72;

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.ceil((base64.length * 3) / 4);
}

function resizeImageDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const render = (maxPx: number, quality: number) => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const context = canvas.getContext('2d');
        if (!context) return dataUrl;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
      };

      let maxPx = PROFILE_IMAGE_MAX_PX;
      let quality = PROFILE_IMAGE_START_QUALITY;
      let output = render(maxPx, quality);

      while (
        estimateDataUrlBytes(output) > PROFILE_IMAGE_MAX_BYTES &&
        (quality > PROFILE_IMAGE_MIN_QUALITY || maxPx > PROFILE_IMAGE_MIN_PX)
      ) {
        if (quality > PROFILE_IMAGE_MIN_QUALITY) {
          quality = Math.max(PROFILE_IMAGE_MIN_QUALITY, quality - 0.08);
        } else {
          maxPx = Math.max(PROFILE_IMAGE_MIN_PX, Math.round(maxPx * 0.82));
        }
        output = render(maxPx, quality);
      }

      resolve(output);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const DELETE_ACCOUNT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`;

const SHARE_PRIVACY_OPTIONS: Array<[keyof SharePrivacyPreferences, string]> = [
  ['includeName', 'Include display name'],
  ['includePhoto', 'Include profile photo in preview'],
  ['includeBadges', 'Include milestone badge'],
  ['includeDomainDetail', 'Show four area scores'],
  ['includeStats', 'Show level and points'],
];

export default function YouScreen() {
  const {
    profile,
    authUser,
    currentCycle,
    customRoutes,
    profileImageDataUrl,
    notificationPreferences,
    sharePrivacyPreferences,
    themePreference,
    setProfileImageDataUrl,
    setNotificationPreferences,
    setSharePrivacyPreferences,
    setThemePreference,
    addCustomRoute,
    archiveCustomRoute,
    signOut,
  } = useAppStore();
  const { data: squadPulse } = useSquadPulse();
  const { mutate: matchToSquad, isPending: isMatching } = useMatchToSquad();
  const squadFeatureEnabled = isSquadFeatureEnabled();
  const [pushStatus, setPushStatus] = useState<
    'idle' | 'requesting' | 'done' | 'denied' | 'unsupported'
  >('idle');
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [sharePrivacyStatus, setSharePrivacyStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const todayNotificationKey = getLocalNotificationDateKey(new Date());
  const escalationPausedToday = notificationPreferences.pausedDate === todayNotificationKey;

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

  const markSettingsDirty = useCallback(() => {
    setSettingsDirty(true);
    setSettingsStatus('idle');
    setSettingsError(null);
  }, []);

  const updateNotificationPreferences = useCallback(
    (preferences: Partial<typeof notificationPreferences>) => {
      setNotificationPreferences(preferences);
      markSettingsDirty();
    },
    [markSettingsDirty, setNotificationPreferences],
  );

  const handleEnableNotifications = useCallback(async () => {
    const next = { ...notificationPreferences, enabled: true, webPushEnabled: false };
    setNotificationPreferences({ enabled: true, webPushEnabled: false });
    markSettingsDirty();
    if (!isPushSupported()) {
      setPushStatus('unsupported');
      return;
    }
    setPushStatus('requesting');
    const ok = await registerPushForCurrentUser({ ...next, webPushEnabled: true });
    setPushStatus(ok ? 'done' : Notification.permission === 'denied' ? 'denied' : 'idle');
    setNotificationPreferences({ webPushEnabled: ok });
    if (ok) {
      setSettingsDirty(false);
      setSettingsStatus('saved');
    } else {
      markSettingsDirty();
    }
  }, [markSettingsDirty, notificationPreferences, setNotificationPreferences]);

  const handleDisableNotifications = useCallback(async () => {
    const next = { ...notificationPreferences, enabled: false, webPushEnabled: false };
    setNotificationPreferences({ enabled: false, webPushEnabled: false });
    markSettingsDirty();
    if (isPushSupported()) await unsubscribeFromPush();
    await syncPushPreferencesForCurrentUser(next);
    setPushStatus(isPushSupported() ? 'idle' : 'unsupported');
  }, [markSettingsDirty, notificationPreferences, setNotificationPreferences]);

  const handlePauseEscalationToday = useCallback(() => {
    updateNotificationPreferences({
      pausedDate: escalationPausedToday ? null : todayNotificationKey,
    });
  }, [escalationPausedToday, todayNotificationKey, updateNotificationPreferences]);

  const handleThemeChange = useCallback(
    (theme: ThemePreference) => {
      setThemePreference(theme);
      markSettingsDirty();
    },
    [markSettingsDirty, setThemePreference],
  );

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
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
  const availableDomains = getAvailableDomains(authUser?.email);
  const domainLabels = new Map(availableDomains.map((domain) => [domain.type, domain.label]));
  const routeParentDomain = availableDomains.find((domain) => domain.type === routeParent);
  const routeSetupOptions = routeParentDomain
    ? buildDomainSetupOptionModel(
        routeParentDomain,
        routeLabel.trim()
          ? {
              label: routeLabel,
              focusDescription: routeFocus,
            }
          : null,
      )
    : null;
  const activeCustomRoutes = customRoutes.filter((route) => !route.archivedAt);

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
      setDeleteError('Sign in again before deleting your account.');
      setIsDeleting(false);
      return;
    }
    const res = await fetch(DELETE_ACCOUNT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      await signOut();
      localStorage.removeItem('12k-app-store');
    } else {
      setDeleteError('Delete failed. Please try again or contact support.');
      setIsDeleting(false);
    }
  }, [signOut]);

  const saveSettingsSnapshot = useCallback(
    async (
      overrides?: {
        profileImageDataUrl?: string | null;
        notificationPreferences?: typeof notificationPreferences;
        sharePrivacyPreferences?: SharePrivacyPreferences;
        themePreference?: ThemePreference;
      },
      options?: { syncPush?: boolean },
    ): Promise<boolean> => {
      if (!profile) return false;
      const nextNotificationPreferences =
        overrides?.notificationPreferences ?? notificationPreferences;

      setSettingsStatus('saving');
      setSettingsError(null);

      try {
        await saveUserSettings({
          userId: profile.id,
          profileImageDataUrl: overrides?.profileImageDataUrl ?? profileImageDataUrl,
          notificationPreferences: nextNotificationPreferences,
          sharePrivacyPreferences: overrides?.sharePrivacyPreferences ?? sharePrivacyPreferences,
          themePreference: overrides?.themePreference ?? themePreference,
        });

        if ((options?.syncPush ?? true) && nextNotificationPreferences.webPushEnabled) {
          const pushSynced = await syncPushPreferencesForCurrentUser(nextNotificationPreferences);
          if (!pushSynced) {
            setSettingsDirty(true);
            setSettingsStatus('error');
            setSettingsError(
              'Saved to your account, but web push delivery did not update. Try Save settings again.',
            );
            return false;
          }
        }

        setSettingsDirty(false);
        setSettingsStatus('saved');
        return true;
      } catch (error) {
        setSettingsDirty(true);
        setSettingsStatus('error');
        setSettingsError(error instanceof Error ? error.message : 'Settings could not be saved.');
        return false;
      }
    },
    [
      notificationPreferences,
      profile,
      profileImageDataUrl,
      sharePrivacyPreferences,
      themePreference,
    ],
  );

  const handleSaveSettings = useCallback(async () => {
    await saveSettingsSnapshot();
  }, [saveSettingsSnapshot]);

  const handleSharePrivacyChange = useCallback(
    async (key: keyof SharePrivacyPreferences, checked: boolean) => {
      const nextSharePrivacyPreferences = {
        ...sharePrivacyPreferences,
        [key]: checked,
      };

      setSharePrivacyPreferences(nextSharePrivacyPreferences);
      setSettingsDirty(true);
      setSharePrivacyStatus('saving');

      const saved = await saveSettingsSnapshot(
        {
          sharePrivacyPreferences: nextSharePrivacyPreferences,
        },
        { syncPush: false },
      );

      setSharePrivacyStatus(saved ? 'saved' : 'error');
    },
    [saveSettingsSnapshot, setSharePrivacyPreferences, sharePrivacyPreferences],
  );

  const handleProfileImage = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const resized = await resizeImageDataUrl(reader.result);
          setProfileImageDataUrl(resized);
          markSettingsDirty();
        }
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [markSettingsDirty, setProfileImageDataUrl],
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
      setRouteError('Extra action could not be saved. Check the name and focus, then try again.');
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
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
              Reminder style: {anchorName}
            </p>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-base-subtext text-xs">Total</p>
            <p className="font-heading font-bold text-base-text">
              {formatKairosPoints(profile.xp)}
            </p>
          </div>
          <div>
            <p className="text-base-subtext text-xs">Level</p>
            <p className="font-heading font-bold text-base-text">
              {level.level}: {level.label}
            </p>
          </div>
        </div>
      </Card>

      <Card className={settingsDirty ? 'border-status-partial/50' : undefined}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-1">
              Account settings
            </p>
            <p className="text-base-subtext text-sm">
              {settingsDirty
                ? 'Unsaved changes'
                : settingsStatus === 'saved'
                  ? 'Saved to your account'
                  : 'Profile photo, reminders, privacy, and theme'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => void handleSaveSettings()}
            disabled={settingsStatus === 'saving'}
            className="w-full sm:w-auto"
          >
            {settingsStatus === 'saving' ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
        <div aria-live="polite" className="mt-3 min-h-4">
          {settingsStatus === 'error' && (
            <p role="alert" className="text-status-missed text-xs">
              {settingsError ?? 'Settings could not be saved.'}
            </p>
          )}
          {settingsStatus === 'saved' && !settingsDirty && (
            <p className="text-accent-green text-xs">Saved in the database.</p>
          )}
        </div>
      </Card>

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">
          Appearance
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['dark', 'Dark'],
            ['light', 'Light'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={themePreference === value}
              onClick={() => handleThemeChange(value as ThemePreference)}
              className={`min-h-11 rounded-lg border px-3 py-2 text-center font-heading text-sm tracking-wide transition-colors ${
                themePreference === value
                  ? 'border-accent-green bg-accent-green/10 text-base-text'
                  : 'border-base-border bg-base-elevated text-base-subtext hover:border-accent-green/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Extra actions */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-3">
          Extra actions
        </p>
        <p className="text-base-subtext text-sm mb-2">{FEATURE_EXPLANATIONS.personalRoutes}</p>
        <p className="text-base-muted text-xs mb-4">{FEATURE_EXPLANATIONS.personalRoutesAction}</p>
        <DismissibleTip
          profileId={profile.id}
          tipId="settings-sub-focus"
          eyebrow="Settings tip"
          title="Create your own extra actions"
          className="mb-4"
        >
          <p>
            Body, Fuel, Self, and Connection never change. Use this settings area to add your own
            extra actions underneath them, such as work, money, family, photography, study, or
            recovery.
          </p>
        </DismissibleTip>
        <div className="flex flex-col gap-2 mb-4">
          {activeCustomRoutes.length === 0 ? (
            <p className="text-base-muted text-sm">No extra actions active.</p>
          ) : (
            activeCustomRoutes.map((route) => (
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
        <div className="flex flex-col gap-2">
          <label className="text-base-subtext text-xs font-heading tracking-widest uppercase">
            Core area
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
            placeholder="Action name, e.g. Lens"
            value={routeLabel}
            onChange={(e) => setRouteLabel(e.target.value)}
          />
          {routeSetupOptions && (
            <SetupOptionSections
              model={routeSetupOptions}
              value={routeFocus}
              onSelect={setRouteFocus}
            />
          )}
          <textarea
            className="input-field h-20 resize-none"
            placeholder={
              routeSetupOptions
                ? `Custom. ${routeSetupOptions.customPlaceholder}. What does a small win look like?`
                : 'What does a small win look like?'
            }
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
            {isAddingRoute ? 'Adding...' : 'Add action'}
          </Button>
        </div>
      </Card>

      {squadFeatureEnabled && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Squad
          </p>
          <p className="text-base-subtext text-sm mb-3">{FEATURE_EXPLANATIONS.squad}</p>
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
                <p className="text-base-subtext text-sm">
                  You are matched. The weekly pulse appears after the next pulse run.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-base-subtext text-sm mb-3">
                You have not joined a squad yet. Tapping below finds a private group at a similar
                point in 12K.
              </p>
              <Button size="sm" onClick={() => matchToSquad()} disabled={isMatching}>
                {isMatching ? 'Matching...' : 'Find anonymous squad'}
              </Button>
            </>
          )}
        </Card>
      )}

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
          Open weekly check-in
        </Button>
      </Card>

      {/* Notifications */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Notifications
        </p>
        <p className="text-base-subtext text-sm mb-4">{FEATURE_EXPLANATIONS.notifications}</p>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
              Reminder preview
            </p>
            <div className="grid grid-cols-1 gap-2">
              {REMINDER_INTENSITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  aria-pressed={notificationPreferences.intensity === option.id}
                  onClick={() => updateNotificationPreferences({ intensity: option.id })}
                  className={`min-h-11 rounded-lg border p-3 text-left transition-colors ${
                    notificationPreferences.intensity === option.id
                      ? 'border-accent-green bg-accent-green/10 text-base-text'
                      : 'border-base-border bg-base-elevated text-base-subtext hover:border-accent-green/60'
                  }`}
                >
                  <span className="block font-heading text-sm tracking-wide">{option.label}</span>
                  <span className="block text-xs mt-1">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-base-border bg-base-elevated p-3">
            <p className="font-heading text-sm text-base-text tracking-wide">
              {notificationPreferences.intensity === 'high' ? 'Extra support' : 'Selected level'}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-base-subtext">
              {INTENSITY_PREVIEW_COPY[notificationPreferences.intensity].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          {pushStatus === 'unsupported' && (
            <p className="rounded-lg border border-status-partial/40 bg-status-partial/10 p-3 text-sm text-base-subtext">
              Web push is not supported here. 12K will keep in-app Home ideas available instead of
              failing silently. Save settings to keep this preference on your account.
            </p>
          )}
          {pushStatus === 'denied' && (
            <p className="rounded-lg border border-status-missed/40 bg-status-missed/10 p-3 text-sm text-base-subtext">
              Browser notifications are blocked. Your reminder preference can still be saved here.
            </p>
          )}
          {notificationPreferences.enabled && pushStatus === 'idle' && isPushSupported() && (
            <div className="rounded-lg border border-status-partial/40 bg-status-partial/10 p-3">
              <p className="text-sm text-base-subtext">
                Reminders are selected, but this phone still needs browser permission.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleEnableNotifications()}
                className="mt-3 w-full"
              >
                Turn on phone alerts
              </Button>
            </div>
          )}

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
            <span>Early start help</span>
            <input
              type="checkbox"
              checked={notificationPreferences.earlyProtocol}
              disabled={!notificationPreferences.enabled}
              onChange={(e) => updateNotificationPreferences({ earlyProtocol: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-base-subtext">
            <span>Show action names in notifications</span>
            <input
              type="checkbox"
              checked={notificationPreferences.revealRouteNames}
              disabled={!notificationPreferences.enabled}
              onChange={(e) =>
                updateNotificationPreferences({ revealRouteNames: e.target.checked })
              }
            />
          </label>

          {notificationPreferences.enabled && notificationPreferences.intensity === 'high' && (
            <div className="flex flex-col gap-2 rounded-lg border border-base-border bg-base-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-heading text-xs tracking-widest text-base-text uppercase">
                  Extra support pause
                </p>
                <p className="mt-1 text-xs text-base-subtext">
                  {escalationPausedToday
                    ? 'Extra reminders are paused today. Tomorrow still uses your saved level.'
                    : 'Pause extra reminders for today without turning reminders off.'}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handlePauseEscalationToday}
                className="w-full sm:w-auto"
              >
                {escalationPausedToday ? 'Resume extra reminders' : 'Pause extra reminders'}
              </Button>
            </div>
          )}

          {pushStatus === 'done' && (
            <p className="text-accent-green text-xs">Web push is connected.</p>
          )}
          {pushStatus === 'requesting' && (
            <p className="text-base-muted text-xs">Setting up notifications...</p>
          )}
        </div>
      </Card>

      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Sharing privacy
        </p>
        <p className="text-base-subtext text-sm mb-4">
          Defaults for controlled progress shares. You still preview before anything leaves the app.
        </p>
        <div className="flex flex-col gap-3">
          {SHARE_PRIVACY_OPTIONS.map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 text-sm text-base-subtext"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={sharePrivacyPreferences[key]}
                disabled={sharePrivacyStatus === 'saving'}
                onChange={(e) => void handleSharePrivacyChange(key, e.target.checked)}
              />
            </label>
          ))}
        </div>
        <div aria-live="polite" className="mt-3 min-h-4">
          {sharePrivacyStatus === 'saving' && (
            <p className="text-base-muted text-xs">Saving privacy defaults...</p>
          )}
          {sharePrivacyStatus === 'saved' && (
            <p className="text-accent-green text-xs">Sharing privacy saved in the database.</p>
          )}
          {sharePrivacyStatus === 'error' && (
            <p role="alert" className="text-status-missed text-xs">
              Sharing privacy could not be saved. Use Save settings, or try again.
            </p>
          )}
        </div>
      </Card>

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

      {/* Account data */}
      <Card>
        <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
          Account and data
        </p>
        <p className="text-base-subtext text-sm mb-4">
          Export gives you a JSON copy of your 12K data, including any health-related notes you
          chose to add. Delete is permanent and clears this account from the app.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleExportData}
          disabled={isExporting}
          className="w-full mb-4"
        >
          {isExporting ? 'Preparing download...' : 'Download my data'}
        </Button>
        <div className="border-t border-base-border pt-4">
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => {
                setDeleteConfirm(true);
                setDeleteError(null);
                setDeletePhrase('');
              }}
              className="text-status-missed text-xs font-heading tracking-wider uppercase w-full text-center"
            >
              Delete my account
            </button>
          ) : (
            <div className="rounded border border-status-missed/40 bg-status-missed/5 p-3">
              <p className="text-base-text text-sm font-heading font-medium mb-1">
                This is permanent.
              </p>
              <p className="text-base-subtext text-xs mb-3">
                This deletes your profile, journey history, check-ins, notes, extra actions,
                reminders, squad link, push subscriptions, and auth account.
              </p>
              <label className="text-base-subtext text-xs font-heading tracking-widest uppercase">
                Type DELETE to confirm
                <input
                  className="input-field mt-1"
                  value={deletePhrase}
                  onChange={(event) => setDeletePhrase(event.target.value)}
                  autoComplete="off"
                />
              </label>
              {deleteError && (
                <p role="alert" className="text-status-missed text-xs mt-3">
                  {deleteError}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isDeleting || deletePhrase !== 'DELETE'}
                  onClick={handleDeleteAccount}
                  className="flex-1"
                >
                  {isDeleting ? 'Deleting...' : 'Delete permanently'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleteConfirm(false);
                    setDeletePhrase('');
                    setDeleteError(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showAbandon && <AbandonCycleModal onClose={() => setShowAbandon(false)} />}
      {showVibeCheck && <WeeklyVibeCheckModal onClose={() => setShowVibeCheck(false)} />}
    </div>
  );
}
