-- 031_harden_user_record_siloing.sql
-- Make user-owned records explicitly belong to the authenticated owner and their
-- own Kairos cycle. This keeps direct writes, stale clients, and RPC helpers from
-- creating cross-user or cross-journey links.

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users manage own cycles" on public.kairos_cycles;
create policy "Users manage own cycles"
  on public.kairos_cycles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own domain focuses" on public.user_domain_focuses;
create policy "Users manage own domain focuses"
  on public.user_domain_focuses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own check-ins" on public.daily_check_ins;
create policy "Users manage own check-ins"
  on public.daily_check_ins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own streaks" on public.user_streaks;
create policy "Users manage own streaks"
  on public.user_streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own vibe checks" on public.vibe_checks;
create policy "Users manage own vibe checks"
  on public.vibe_checks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own nudges" on public.ai_nudges;
create policy "Users manage own nudges"
  on public.ai_nudges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own push subscription" on public.push_subscriptions;
create policy "Users manage own push subscription"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index if not exists kairos_cycles_id_user_id_idx
  on public.kairos_cycles (id, user_id);

create unique index if not exists custom_routes_id_user_cycle_idx
  on public.custom_routes (id, user_id, cycle_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_current_cycle_owner_fk'
  ) then
    alter table public.profiles
      add constraint profiles_current_cycle_owner_fk
      foreign key (current_kairos_cycle_id, id)
      references public.kairos_cycles (id, user_id)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_domain_focuses_cycle_owner_fk'
  ) then
    alter table public.user_domain_focuses
      add constraint user_domain_focuses_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'daily_check_ins_cycle_owner_fk'
  ) then
    alter table public.daily_check_ins
      add constraint daily_check_ins_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vibe_checks_cycle_owner_fk'
  ) then
    alter table public.vibe_checks
      add constraint vibe_checks_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cycle_reflections_cycle_owner_fk'
  ) then
    alter table public.cycle_reflections
      add constraint cycle_reflections_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'custom_routes_cycle_owner_fk'
  ) then
    alter table public.custom_routes
      add constraint custom_routes_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'custom_route_check_ins_cycle_owner_fk'
  ) then
    alter table public.custom_route_check_ins
      add constraint custom_route_check_ins_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'custom_route_check_ins_route_owner_fk'
  ) then
    alter table public.custom_route_check_ins
      add constraint custom_route_check_ins_route_owner_fk
      foreign key (route_id, user_id, cycle_id)
      references public.custom_routes (id, user_id, cycle_id)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'outcomes_cycle_owner_fk'
  ) then
    alter table public.outcomes
      add constraint outcomes_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;
end $$;

alter table public.profiles validate constraint profiles_current_cycle_owner_fk;
alter table public.user_domain_focuses validate constraint user_domain_focuses_cycle_owner_fk;
alter table public.daily_check_ins validate constraint daily_check_ins_cycle_owner_fk;
alter table public.vibe_checks validate constraint vibe_checks_cycle_owner_fk;
alter table public.cycle_reflections validate constraint cycle_reflections_cycle_owner_fk;
alter table public.custom_routes validate constraint custom_routes_cycle_owner_fk;
alter table public.custom_route_check_ins validate constraint custom_route_check_ins_cycle_owner_fk;
alter table public.custom_route_check_ins validate constraint custom_route_check_ins_route_owner_fk;
alter table public.outcomes validate constraint outcomes_cycle_owner_fk;

alter function public.update_streak(uuid, text, date, text) set search_path = public;
alter function public.trigger_update_streak() set search_path = public;
alter function public.increment_squad_member_count(uuid, integer) set search_path = public;
alter function public.decrement_squad_member_count(uuid) set search_path = public;

revoke all on function public.update_streak(uuid, text, date, text) from public, anon, authenticated;
revoke all on function public.trigger_update_streak() from public, anon, authenticated;
revoke all on function public.increment_squad_member_count(uuid, integer) from public, anon, authenticated;
revoke all on function public.decrement_squad_member_count(uuid) from public, anon, authenticated;

grant execute on function public.increment_squad_member_count(uuid, integer) to service_role;
grant execute on function public.decrement_squad_member_count(uuid) to service_role;
