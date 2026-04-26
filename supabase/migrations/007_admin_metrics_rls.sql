-- 007_admin_metrics_rls.sql
-- Adds a SELECT policy on metrics_snapshots for admin users.
-- The is_admin() function checks the user's email against auth.users
-- and uses security definer to read from auth schema.

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
    and email = 'liam@whatisnext.io'
  );
$$ language sql security definer stable;

create policy "Admin reads metrics snapshots"
  on metrics_snapshots for select
  using (is_admin());
