import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('account settings persistence', () => {
  it('creates an RLS-protected user settings table for all You screen preferences', () => {
    const migration = readFileSync('supabase/migrations/028_user_settings.sql', 'utf8');

    expect(migration).toContain('create table if not exists public.user_settings');
    expect(migration).toContain('user_id uuid primary key references public.profiles(id)');
    expect(migration).toContain('profile_image_data_url text');
    expect(migration).toContain('notification_preferences jsonb not null');
    expect(migration).toContain('share_privacy_preferences jsonb not null');
    expect(migration).toContain("theme text not null default 'dark'");
    expect(migration).toContain('alter table public.user_settings enable row level security');
    expect(migration).toContain('auth.uid() = user_id');
    expect(migration).toContain('user_settings_updated_at');
  });

  it('saves and loads account settings through the Supabase user_settings table', () => {
    const service = readFileSync('src/services/userSettings.ts', 'utf8');
    const bootstrap = readFileSync('src/hooks/useBootstrap.ts', 'utf8');
    const screen = readFileSync('src/pages/YouScreen.tsx', 'utf8');

    expect(service).toContain(".from('user_settings')");
    expect(service).toContain("{ onConflict: 'user_id' }");
    expect(service).toContain('normaliseNotificationPreferences');
    expect(service).toContain('normaliseSharePrivacyPreferences');
    expect(service).toContain('normaliseThemePreference');
    expect(bootstrap).toContain('loadUserSettings(user.id)');
    expect(bootstrap).toContain('setProfileImageDataUrl(settings.profileImageDataUrl)');
    expect(bootstrap).toContain('setNotificationPreferences(settings.notificationPreferences)');
    expect(bootstrap).toContain('setSharePrivacyPreferences(settings.sharePrivacyPreferences)');
    expect(bootstrap).toContain('setThemePreference(settings.themePreference)');
    expect(screen).toContain('Save settings');
    expect(screen).toContain('saveUserSettings({');
    expect(screen).toContain('Saved in the database.');
    expect(screen).toContain('handleSharePrivacyChange');
    expect(screen).toContain('nextSharePrivacyPreferences');
    expect(screen).toContain('sharePrivacyPreferences: nextSharePrivacyPreferences');
    expect(screen).toContain('Sharing privacy saved in the database.');
    expect(screen).toContain('{ syncPush: false }');
  });

  it('mirrors reminder preferences from the push Edge Function into user settings', () => {
    const edgeFunction = readFileSync('supabase/functions/save-push-subscription/index.ts', 'utf8');

    expect(edgeFunction).toContain('.from("user_settings")');
    expect(edgeFunction).toContain('notification_preferences: body.preferences');
    expect(edgeFunction).toContain('{ onConflict: "user_id" }');

    const registration = readFileSync('src/services/pushSubscription.ts', 'utf8');
    expect(registration).toContain('registerPushForCurrentUser');
    expect(registration).toContain('syncPushPreferencesForCurrentUser');
    expect(registration).toContain('save-push-subscription');
  });
});
