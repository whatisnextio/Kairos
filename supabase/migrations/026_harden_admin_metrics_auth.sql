-- 026_harden_admin_metrics_auth.sql
-- Server-side admin metrics access must not depend on client-visible email checks.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

drop policy if exists "Admin reads metrics snapshots" on public.metrics_snapshots;
create policy "Admin reads metrics snapshots"
  on public.metrics_snapshots for select
  using (public.is_admin());
