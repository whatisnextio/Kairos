-- 001_initial_schema.sql
-- Run against Supabase project (EU region)
-- All tables use RLS. Users can only read/write their own rows.

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── Identity Anchors (seed data, public read) ───────────────────────────────

create table identity_anchors (
  id   text primary key,
  name text not null,
  description text not null,
  icon text
);

insert into identity_anchors (id, name, description) values
  ('provider', 'The Provider',  'You show up. Every day. No excuses.'),
  ('builder',  'The Builder',   'You make things real that others only imagine.'),
  ('guardian', 'The Guardian',  'You protect what matters. Family, health, standards.'),
  ('leader',   'The Leader',    'Others follow because you go first.'),
  ('mentor',   'The Mentor',    'Your hard-won lessons become someone else''s shortcut.'),
  ('creator',  'The Creator',   'You build worlds with your hands or mind.'),
  ('custom',   'Custom',        'Define your own.');

-- ─── Profiles ────────────────────────────────────────────────────────────────

create table profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  display_name             text not null,
  identity_anchor_id       text not null references identity_anchors(id),
  custom_anchor_name       text,
  tier                     text not null default 'free' check (tier in ('free', 'brotherhood')),
  xp                       integer not null default 0,
  current_kairos_cycle_id  uuid,
  date_of_birth            date not null,
  squad_id                 uuid,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  subscription_status      text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ─── Kairos Cycles ───────────────────────────────────────────────────────────

create table kairos_cycles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  start_date            date not null,
  end_date              date,
  status                text not null default 'active'
                          check (status in ('active', 'completed', 'reset', 'abandoned')),
  total_xp_earned       integer default 0,
  completion_percentage numeric(5,2) default 0,
  created_at            timestamptz default now()
);

alter table kairos_cycles enable row level security;

create policy "Users manage own cycles"
  on kairos_cycles for all
  using (auth.uid() = user_id);

-- Add FK back to profiles once kairos_cycles exists
alter table profiles
  add constraint fk_current_cycle
  foreign key (current_kairos_cycle_id) references kairos_cycles(id);

-- ─── User Domain Focuses ──────────────────────────────────────────────────────

create table user_domain_focuses (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete cascade,
  cycle_id                 uuid not null references kairos_cycles(id) on delete cascade,
  domain_type              text not null check (domain_type in ('BODY', 'LOVE', 'MISSION', 'SPIRIT')),
  focus_description        text not null,
  set_at                   timestamptz default now(),
  unique (user_id, cycle_id, domain_type)
);

alter table user_domain_focuses enable row level security;

create policy "Users manage own domain focuses"
  on user_domain_focuses for all
  using (auth.uid() = user_id);

-- ─── Daily Check-ins ──────────────────────────────────────────────────────────

create table daily_check_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  cycle_id    uuid not null references kairos_cycles(id) on delete cascade,
  date        date not null,
  domain_type text not null check (domain_type in ('BODY', 'LOVE', 'MISSION', 'SPIRIT')),
  status      text not null check (status in ('Done', 'Partial', 'Missed', 'Pending', 'Protected')),
  notes       text,
  xp_awarded  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, cycle_id, date, domain_type)
);

alter table daily_check_ins enable row level security;

create policy "Users manage own check-ins"
  on daily_check_ins for all
  using (auth.uid() = user_id);

-- ─── User Streaks ─────────────────────────────────────────────────────────────

create table user_streaks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  domain_type         text not null check (domain_type in ('BODY', 'LOVE', 'MISSION', 'SPIRIT')),
  current_streak      integer default 0,
  longest_streak      integer default 0,
  last_check_in_date  date,
  unique (user_id, domain_type)
);

alter table user_streaks enable row level security;

create policy "Users manage own streaks"
  on user_streaks for all
  using (auth.uid() = user_id);

-- ─── Vibe Checks ──────────────────────────────────────────────────────────────

create table vibe_checks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  cycle_id   uuid not null references kairos_cycles(id) on delete cascade,
  date       date not null,
  rating     integer not null check (rating between 1 and 5),
  created_at timestamptz default now()
);

alter table vibe_checks enable row level security;

create policy "Users manage own vibe checks"
  on vibe_checks for all
  using (auth.uid() = user_id);

-- ─── Squads ───────────────────────────────────────────────────────────────────

create table squads (
  id                  uuid primary key default gen_random_uuid(),
  kairos_phase        text not null check (kairos_phase in ('KICKOFF','ANCHOR','INCREASE','RHYTHM','OWN','SUSTAIN')),
  cycle_start_window  date not null,
  member_count        integer default 0,
  created_at          timestamptz default now()
);

alter table squads enable row level security;

-- Squad members can read their own squad
create policy "Squad members read own squad"
  on squads for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.squad_id = squads.id
    )
  );

-- Service role can manage squads (Edge Functions use service role)
create policy "Service role manages squads"
  on squads for all
  using (auth.role() = 'service_role');

-- Add FK from profiles to squads
alter table profiles
  add constraint fk_squad
  foreign key (squad_id) references squads(id);

-- ─── Squad Pulses ─────────────────────────────────────────────────────────────

create table squad_pulses (
  id           uuid primary key default gen_random_uuid(),
  squad_id     uuid not null references squads(id) on delete cascade,
  week_number  integer not null check (week_number between 1 and 12),
  message      text not null,
  generated_at timestamptz default now(),
  unique (squad_id, week_number)
);

alter table squad_pulses enable row level security;

create policy "Squad members read own squad pulses"
  on squad_pulses for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.squad_id = squad_pulses.squad_id
    )
  );

create policy "Service role manages squad pulses"
  on squad_pulses for all
  using (auth.role() = 'service_role');

-- ─── AI Nudges ────────────────────────────────────────────────────────────────

create table ai_nudges (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  date         date not null,
  type         text not null check (type in ('daily_nudge', 'weekly_challenge', 'squad_pulse', 'cycle_reflection')),
  title        text not null,
  body         text not null,
  domain_type  text check (domain_type in ('BODY', 'LOVE', 'MISSION', 'SPIRIT')),
  kairos_phase text check (kairos_phase in ('KICKOFF','ANCHOR','INCREASE','RHYTHM','OWN','SUSTAIN')),
  xp_reward    integer,
  status       text default 'new' check (status in ('new', 'accepted', 'completed', 'dismissed')),
  cta          text check (cta in ('check_in_now', 'reflect', 'plan_tomorrow')),
  generated_at timestamptz default now(),
  cost_pence   integer,
  unique (user_id, date, type)
);

alter table ai_nudges enable row level security;

create policy "Users manage own nudges"
  on ai_nudges for all
  using (auth.uid() = user_id);

create policy "Service role manages nudges"
  on ai_nudges for all
  using (auth.role() = 'service_role');

-- ─── Outcomes (metrics tracking) ──────────────────────────────────────────────

create table outcomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  cycle_id     uuid references kairos_cycles(id),
  metric_type  text not null,
  metric_value numeric,
  recorded_at  timestamptz default now()
);

alter table outcomes enable row level security;

create policy "Users read own outcomes"
  on outcomes for select
  using (auth.uid() = user_id);

create policy "Service role manages outcomes"
  on outcomes for all
  using (auth.role() = 'service_role');

-- ─── Metrics Snapshots (admin only) ──────────────────────────────────────────

create table metrics_snapshots (
  id              uuid primary key default gen_random_uuid(),
  snapshot_date   date not null unique,
  total_users     integer default 0,
  paid_users      integer default 0,
  conversion_rate numeric(5,2) default 0,
  day7_retention  numeric(5,2) default 0,
  day84_completion numeric(5,2) default 0,
  mrr_pence       integer default 0,
  computed_at     timestamptz default now()
);

alter table metrics_snapshots enable row level security;

create policy "Service role manages metrics"
  on metrics_snapshots for all
  using (auth.role() = 'service_role');

-- ─── Updated_at trigger ──────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger check_ins_updated_at
  before update on daily_check_ins
  for each row execute function update_updated_at();

-- ─── New user profile trigger ─────────────────────────────────────────────────
-- Creates a minimal profile row on auth.users insert.
-- Full profile is written by the onboarding flow.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, identity_anchor_id, date_of_birth)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'New user'),
    'custom',
    coalesce((new.raw_user_meta_data->>'date_of_birth')::date, current_date)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
