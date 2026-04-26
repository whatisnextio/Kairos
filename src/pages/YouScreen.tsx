import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import AbandonCycleModal from '@/components/modals/AbandonCycleModal';
import { useMatchToSquad, useSquadPulse } from '@/hooks/useSquad';
import { isPushSupported, subscribeToPush } from '@/services/pushNotifications';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { IDENTITY_ANCHORS } from '@/types';
import { getLevelForXp } from '@/utils/gamification';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

const SAVE_PUSH_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-push-subscription`;
const DELETE_ACCOUNT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`;

async function registerPush(): Promise<boolean> {
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
    body: JSON.stringify({ subscription: sub }),
  });
  return res.ok;
}

export default function YouScreen() {
  const { profile, authUser, signOut } = useAppStore();
  const { data: squadPulse } = useSquadPulse();
  const { mutate: matchToSquad, isPending: isMatching } = useMatchToSquad();
  const [pushStatus, setPushStatus] = useState<'idle' | 'requesting' | 'done' | 'denied'>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAbandon, setShowAbandon] = useState(false);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setIsDeleting(false);
      return;
    }
    await fetch(DELETE_ACCOUNT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    signOut();
  }, [signOut]);

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
        <p className="font-heading text-lg font-bold text-base-text">{profile.displayName}</p>
        <p className="text-accent-green text-sm font-heading tracking-wider mt-0.5">{anchorName}</p>
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

      {/* Squad: brotherhood only */}
      {profile.tier === 'brotherhood' && (
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
        <p className="font-heading font-medium text-base-text capitalize">{profile.tier}</p>
        {profile.tier === 'free' && (
          <Link to="/subscription">
            <Button size="sm" className="mt-3">
              Upgrade to Brotherhood
            </Button>
          </Link>
        )}
        {profile.tier === 'brotherhood' && (
          <>
            <p className="text-base-subtext text-xs mt-1">Brotherhood active.</p>
            <a
              href={`${import.meta.env.VITE_STRIPE_PORTAL_URL}?prefilled_email=${encodeURIComponent(authUser?.email ?? '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-base-muted hover:text-base-subtext underline mt-2 inline-block"
            >
              Manage billing
            </a>
          </>
        )}
      </Card>

      {/* Notifications: brotherhood only */}
      {profile.tier === 'brotherhood' && isPushSupported() && (
        <Card>
          <p className="text-base-subtext text-xs font-heading tracking-widest uppercase mb-2">
            Notifications
          </p>
          {pushStatus === 'done' ? (
            <p className="text-accent-green text-sm">Daily nudge notifications on.</p>
          ) : pushStatus === 'denied' ? (
            <p className="text-base-muted text-sm">
              Notifications blocked. Enable in your browser settings.
            </p>
          ) : (
            <>
              <p className="text-base-subtext text-sm mb-3">
                Get your daily nudge as a notification, even when the app is closed.
              </p>
              <Button
                size="sm"
                disabled={pushStatus === 'requesting'}
                onClick={async () => {
                  setPushStatus('requesting');
                  const ok = await registerPush();
                  setPushStatus(ok ? 'done' : 'denied');
                }}
              >
                {pushStatus === 'requesting' ? 'Setting up...' : 'Enable notifications'}
              </Button>
            </>
          )}
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
      <div>
        <button
          type="button"
          onClick={() => setShowAbandon(true)}
          className="text-base-muted text-xs underline w-full text-center"
        >
          Reset cycle
        </button>
      </div>

      {/* GDPR account deletion */}
      <div className="pt-2">
        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="text-base-muted text-xs underline w-full text-center"
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
    </div>
  );
}
