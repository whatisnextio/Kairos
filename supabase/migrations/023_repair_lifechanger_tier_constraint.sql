-- Repair production drift where migration history shows Lifechanger applied,
-- but the live profiles_tier_check constraint still only allows Free/Brotherhood.

alter table public.profiles drop constraint if exists profiles_tier_check;

alter table public.profiles
  add constraint profiles_tier_check
  check (tier in ('free', 'brotherhood', 'lifechanger'));
