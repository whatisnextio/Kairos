-- 028_user_settings.sql
-- Account-backed settings for profile image, notification preferences, share defaults, and theme.

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  profile_image_data_url text,
  notification_preferences jsonb not null default
    '{"enabled":false,"intensity":"standard","startHour":5,"endHour":21,"earlyProtocol":true,"webPushEnabled":false,"pausedDate":null,"revealRouteNames":false}'::jsonb,
  share_privacy_preferences jsonb not null default
    '{"includeName":false,"includePhoto":false,"includeBadges":true,"includeDomainDetail":false,"includeStats":true}'::jsonb,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_profile_image_size
    check (profile_image_data_url is null or octet_length(profile_image_data_url) <= 450000)
);

alter table public.user_settings enable row level security;

create policy "Users read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.update_updated_at();

insert into public.user_settings (user_id, notification_preferences, updated_at)
select distinct on (user_id)
  user_id,
  preferences,
  now()
from public.push_subscriptions
where preferences is not null
order by user_id, updated_at desc
on conflict (user_id) do update
set
  notification_preferences = excluded.notification_preferences,
  updated_at = now();
