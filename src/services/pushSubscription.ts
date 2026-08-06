import { subscribeToPush } from '@/services/pushNotifications';
import { supabase } from '@/services/supabaseClient';

const SAVE_PUSH_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-push-subscription`;

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

async function savePushPayload(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return false;

    const res = await fetch(SAVE_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function syncPushPreferencesForCurrentUser(preferences: unknown): Promise<boolean> {
  return savePushPayload({ preferences });
}

export async function registerPushForCurrentUser(preferences: unknown): Promise<boolean> {
  try {
    const subscription = await subscribeToPush();
    if (!subscription) return false;

    return savePushPayload({ subscription, preferences });
  } catch {
    return false;
  }
}
