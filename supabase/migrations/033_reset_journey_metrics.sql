-- 033_reset_journey_metrics.sql
-- Hard reset journey-derived metrics for the authenticated user while keeping
-- account, entitlement, billing, notification, and privacy preferences intact.

create or replace function public.reset_journey_metrics()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_squad_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select squad_id
  into v_squad_id
  from public.profiles
  where id = v_user_id;

  perform set_config('app.profile_trusted_update', 'true', true);

  update public.profiles
  set
    xp = 0,
    current_kairos_cycle_id = null,
    squad_id = null
  where id = v_user_id;

  if v_squad_id is not null then
    update public.squads
    set member_count = greatest(0, member_count - 1)
    where id = v_squad_id;
  end if;

  delete from public.outcomes
  where user_id = v_user_id;

  delete from public.ai_nudges
  where user_id = v_user_id;

  delete from public.cycle_reflections
  where user_id = v_user_id;

  delete from public.custom_route_check_ins
  where user_id = v_user_id;

  delete from public.custom_routes
  where user_id = v_user_id;

  delete from public.vibe_checks
  where user_id = v_user_id;

  delete from public.daily_check_ins
  where user_id = v_user_id;

  delete from public.user_domain_focuses
  where user_id = v_user_id;

  delete from public.user_streaks
  where user_id = v_user_id;

  delete from public.kairos_cycles
  where user_id = v_user_id;
end;
$$;

grant execute on function public.reset_journey_metrics() to authenticated;
