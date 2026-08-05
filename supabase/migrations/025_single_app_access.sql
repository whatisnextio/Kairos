-- 025_single_app_access.sql
-- The current product has one app tier. Keep legacy tier keys for compatibility,
-- but default every profile to app access and remove paid gates from custom routes.

alter table public.profiles
  alter column tier set default 'brotherhood';

alter table public.profiles
  alter column subscription_status set default 'active';

update public.profiles
set
  tier = 'brotherhood',
  subscription_status = 'active',
  cancel_at_period_end = false,
  current_period_end = null
where tier = 'free'
   or subscription_status is distinct from 'active';

create or replace function public.guard_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  trusted_update boolean := coalesce(current_setting('app.profile_trusted_update', true), '') = 'true';
  actor_role text := coalesce(auth.role(), '');
begin
  if trusted_update or actor_role = 'service_role' then
    return new;
  end if;

  if actor_role <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.tier <> 'brotherhood'
      or coalesce(new.xp, 0) <> 0
      or new.squad_id is not null
      or new.stripe_customer_id is not null
      or new.stripe_subscription_id is not null
      or coalesce(new.subscription_status, 'active') <> 'active'
      or coalesce(new.cancel_at_period_end, false) <> false
      or new.current_period_end is not null
    then
      raise exception 'Profile app access fields cannot be set directly';
    end if;
    return new;
  end if;

  if new.tier is distinct from old.tier
    or new.xp is distinct from old.xp
    or new.squad_id is distinct from old.squad_id
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.subscription_status is distinct from old.subscription_status
    or new.cancel_at_period_end is distinct from old.cancel_at_period_end
    or new.current_period_end is distinct from old.current_period_end
  then
    raise exception 'Profile app access fields cannot be changed directly';
  end if;

  return new;
end;
$$;

drop policy if exists "Paid users insert own custom routes" on public.custom_routes;
drop policy if exists "Paid users update own custom routes" on public.custom_routes;

create policy "Users insert own custom routes"
  on public.custom_routes for insert
  with check (auth.uid() = user_id);

create policy "Users update own custom routes"
  on public.custom_routes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Paid users write own custom route check-ins"
  on public.custom_route_check_ins;
drop policy if exists "Paid users update own custom route check-ins"
  on public.custom_route_check_ins;

create policy "Users write own custom route check-ins"
  on public.custom_route_check_ins for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.custom_routes r
      where r.id = route_id
        and r.user_id = auth.uid()
        and r.cycle_id = custom_route_check_ins.cycle_id
        and r.archived_at is null
    )
  );

create policy "Users update own custom route check-ins"
  on public.custom_route_check_ins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
