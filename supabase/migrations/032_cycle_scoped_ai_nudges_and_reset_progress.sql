-- 032_cycle_scoped_ai_nudges_and_reset_progress.sql
-- Same-day journey resets need a new AI card and fresh progress state. Scope
-- AI nudges to the active cycle and expose a trusted reset path for profile KP.

alter table public.ai_nudges
  add column if not exists cycle_id uuid;

alter table public.ai_nudges
  drop constraint if exists ai_nudges_user_id_date_type_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_nudges_user_cycle_date_type_key'
  ) then
    alter table public.ai_nudges
      add constraint ai_nudges_user_cycle_date_type_key
      unique nulls not distinct (user_id, cycle_id, date, type);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ai_nudges_cycle_owner_fk'
  ) then
    alter table public.ai_nudges
      add constraint ai_nudges_cycle_owner_fk
      foreign key (cycle_id, user_id)
      references public.kairos_cycles (id, user_id)
      on delete cascade
      not valid;
  end if;
end $$;

alter table public.ai_nudges validate constraint ai_nudges_cycle_owner_fk;

create index if not exists ai_nudges_user_cycle_date_idx
  on public.ai_nudges (user_id, cycle_id, date);

create or replace function public.reset_profile_progress(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_xp integer := 0;
begin
  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if auth.uid() is distinct from p_user_id and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Cannot reset another user profile';
  end if;

  perform set_config('app.profile_trusted_update', 'true', true);

  select coalesce(sum(greatest(coalesce(total_xp_earned, 0), 0)), 0)::integer
  into completed_xp
  from public.kairos_cycles
  where user_id = p_user_id
    and status = 'completed';

  update public.profiles
  set xp = completed_xp
  where id = p_user_id;

  delete from public.user_streaks
  where user_id = p_user_id;

  return completed_xp;
end;
$$;

revoke all on function public.reset_profile_progress(uuid) from public, anon;
grant execute on function public.reset_profile_progress(uuid) to authenticated, service_role;
