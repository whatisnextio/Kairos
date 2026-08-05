import {
  type NotificationPreferences,
  normaliseNotificationPreferences,
} from '@/services/localNotifications';
import { supabase } from '@/services/supabaseClient';
import {
  type SharePrivacyPreferences,
  normaliseSharePrivacyPreferences,
} from '@/utils/shareProgress';
import { type ThemePreference, normaliseThemePreference } from '@/utils/theme';

export interface UserSettingsSnapshot {
  userId: string;
  profileImageDataUrl: string | null;
  notificationPreferences: NotificationPreferences;
  sharePrivacyPreferences: SharePrivacyPreferences;
  themePreference: ThemePreference;
}

interface UserSettingsRow {
  user_id: string;
  profile_image_data_url: string | null;
  notification_preferences: Partial<NotificationPreferences> | null;
  share_privacy_preferences: Partial<SharePrivacyPreferences> | null;
  theme: string | null;
}

export function mapUserSettingsRow(row: UserSettingsRow): UserSettingsSnapshot {
  return {
    userId: row.user_id,
    profileImageDataUrl: row.profile_image_data_url,
    notificationPreferences: normaliseNotificationPreferences(row.notification_preferences),
    sharePrivacyPreferences: normaliseSharePrivacyPreferences(row.share_privacy_preferences),
    themePreference: normaliseThemePreference(row.theme),
  };
}

export async function loadUserSettings(userId: string): Promise<UserSettingsSnapshot | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select(
      'user_id,profile_image_data_url,notification_preferences,share_privacy_preferences,theme',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapUserSettingsRow(data as UserSettingsRow) : null;
}

export async function saveUserSettings(settings: UserSettingsSnapshot): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert(
    {
      user_id: settings.userId,
      profile_image_data_url: settings.profileImageDataUrl,
      notification_preferences: normaliseNotificationPreferences(settings.notificationPreferences),
      share_privacy_preferences: normaliseSharePrivacyPreferences(settings.sharePrivacyPreferences),
      theme: normaliseThemePreference(settings.themePreference),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) throw new Error(error.message);
}
