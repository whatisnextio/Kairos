-- 021_custom_routes.sql
-- Paid personal objectives are sub-routes under the public Kairos framework.

create table if not exists public.custom_routes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  cycle_id           uuid not null references public.kairos_cycles(id) on delete cascade,
  parent_domain_type text not null
                       check (parent_domain_type in ('BODY','FUEL','METIME','USTIME')),
  label              text not null check (char_length(trim(label)) between 1 and 32),
  description        text not null default '',
  focus_description  text not null check (char_length(trim(focus_description)) between 1 and 160),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  archived_at        timestamptz
);

alter table public.custom_routes enable row level security;

create policy "Users read own custom routes"
  on public.custom_routes for select
  using (auth.uid() = user_id);

create policy "Paid users insert own custom routes"
  on public.custom_routes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('brotherhood', 'lifechanger')
    )
  );

create policy "Paid users update own custom routes"
  on public.custom_routes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('brotherhood', 'lifechanger')
    )
  );

create table if not exists public.custom_route_check_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  cycle_id    uuid not null references public.kairos_cycles(id) on delete cascade,
  route_id    uuid not null references public.custom_routes(id) on delete restrict,
  date        date not null,
  status      text not null check (status in ('Done', 'Partial', 'Missed', 'Pending', 'Protected')),
  notes       text,
  xp_awarded  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, cycle_id, date, route_id)
);

alter table public.custom_route_check_ins enable row level security;

create policy "Users read own custom route check-ins"
  on public.custom_route_check_ins for select
  using (auth.uid() = user_id);

create policy "Paid users write own custom route check-ins"
  on public.custom_route_check_ins for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('brotherhood', 'lifechanger')
    )
    and exists (
      select 1 from public.custom_routes r
      where r.id = route_id
        and r.user_id = auth.uid()
        and r.cycle_id = custom_route_check_ins.cycle_id
        and r.archived_at is null
    )
  );

create policy "Paid users update own custom route check-ins"
  on public.custom_route_check_ins for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('brotherhood', 'lifechanger')
    )
  );

create index if not exists custom_routes_user_cycle_idx
  on public.custom_routes (user_id, cycle_id, archived_at);

create index if not exists custom_route_check_ins_user_cycle_date_idx
  on public.custom_route_check_ins (user_id, cycle_id, date);

drop trigger if exists custom_routes_updated_at on public.custom_routes;
create trigger custom_routes_updated_at
  before update on public.custom_routes
  for each row execute function update_updated_at();

drop trigger if exists custom_route_check_ins_updated_at on public.custom_route_check_ins;
create trigger custom_route_check_ins_updated_at
  before update on public.custom_route_check_ins
  for each row execute function update_updated_at();
