-- 022_notification_preferences.sql
-- Persist PWA notification preferences alongside the latest push subscription.

alter table public.push_subscriptions
  add column if not exists preferences jsonb not null default
    '{"enabled":true,"intensity":"standard","startHour":5,"endHour":21,"earlyProtocol":true,"webPushEnabled":true}'::jsonb;
