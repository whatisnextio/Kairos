-- Restore remaining V1 product-contract constraints.
-- V1 treats Lifechanger as a paid tier with Brotherhood access until its deeper
-- personalisation features are implemented.

alter table public.profiles drop constraint if exists profiles_tier_check;

alter table public.profiles
  add constraint profiles_tier_check
  check (tier in ('free', 'brotherhood', 'lifechanger'));

alter table public.squad_pulses drop constraint if exists squad_pulses_week_number_check;

alter table public.squad_pulses
  add constraint squad_pulses_week_number_check
  check (week_number between 1 and 12);
