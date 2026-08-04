-- 024_harden_profile_sensitive_updates.sql
-- A user may update their own profile row, but entitlement, billing, XP, and
-- squad fields must only change through trusted server/RPC paths.

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
    if new.tier <> 'free'
      or coalesce(new.xp, 0) <> 0
      or new.squad_id is not null
      or new.stripe_customer_id is not null
      or new.stripe_subscription_id is not null
      or new.subscription_status is not null
      or coalesce(new.cancel_at_period_end, false) <> false
      or new.current_period_end is not null
    then
      raise exception 'Profile entitlement fields cannot be set directly';
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
    raise exception 'Profile entitlement fields cannot be changed directly';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_sensitive_fields on public.profiles;
create trigger guard_profile_sensitive_fields
  before insert or update on public.profiles
  for each row execute function public.guard_profile_sensitive_fields();

create or replace function public.increment_profile_xp(p_user_id uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Cannot increment another user profile';
  end if;

  perform set_config('app.profile_trusted_update', 'true', true);

  update public.profiles
  set xp = greatest(0, xp + p_delta)
  where id = p_user_id;
end;
$$;

grant execute on function public.increment_profile_xp(uuid, integer) to authenticated;

create or replace function public.claim_complimentary_lifechanger()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
  user_email text;
begin
  select lower(email)
  into user_email
  from auth.users
  where id = auth.uid();

  if user_email <> 'ldgmcdowell@gmail.com' then
    raise exception 'Complimentary entitlement is not available for this account';
  end if;

  perform set_config('app.profile_trusted_update', 'true', true);

  update public.profiles
  set
    tier = 'lifechanger',
    subscription_status = 'active',
    cancel_at_period_end = false,
    current_period_end = null
  where id = auth.uid()
  returning * into profile_row;

  if profile_row.id is null then
    raise exception 'Profile not found';
  end if;

  return to_jsonb(profile_row);
end;
$$;

grant execute on function public.claim_complimentary_lifechanger() to authenticated;
