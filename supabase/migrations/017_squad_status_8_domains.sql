-- 017_squad_status_8_domains.sql
-- Updates get_squad_members_status() to return all 8 Liam 42 domains
-- instead of the legacy 4 (BODY, LOVE, MISSION, SPIRIT).
-- Must drop first because the return type signature changes.

drop function if exists get_squad_members_status();

create or replace function get_squad_members_status()
returns table (
  member_index   integer,
  anchor_initial text,
  body_status    text,
  fuel_status    text,
  metime_status  text,
  ustime_status  text,
  shot_status    text,
  lens_status    text,
  nest_status    text,
  roots_status   text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_squad_id uuid;
  v_today    date := current_date;
begin
  select squad_id into v_squad_id
  from profiles
  where id = auth.uid();

  if v_squad_id is null then
    return;
  end if;

  return query
  select
    (row_number() over (order by p.created_at))::integer as member_index,
    upper(left(
      case
        when p.identity_anchor_id = 'custom' then coalesce(p.custom_anchor_name, 'C')
        else p.identity_anchor_id
      end,
    1)) as anchor_initial,
    max(case when dci.domain_type = 'BODY'   then dci.status end) as body_status,
    max(case when dci.domain_type = 'FUEL'   then dci.status end) as fuel_status,
    max(case when dci.domain_type = 'METIME' then dci.status end) as metime_status,
    max(case when dci.domain_type = 'USTIME' then dci.status end) as ustime_status,
    max(case when dci.domain_type = 'SHOT'   then dci.status end) as shot_status,
    max(case when dci.domain_type = 'LENS'   then dci.status end) as lens_status,
    max(case when dci.domain_type = 'NEST'   then dci.status end) as nest_status,
    max(case when dci.domain_type = 'ROOTS'  then dci.status end) as roots_status
  from profiles p
  left join daily_check_ins dci
    on dci.user_id = p.id
   and dci.date = v_today
  where p.squad_id = v_squad_id
  group by p.id, p.created_at, p.identity_anchor_id, p.custom_anchor_name;
end;
$$;

grant execute on function get_squad_members_status() to authenticated;
