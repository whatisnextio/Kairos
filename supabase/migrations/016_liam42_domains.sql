-- 016_liam42_domains.sql
-- Updates domain_type and kairos_phase CHECK constraints from the legacy
-- 4-domain / 6-phase setup to the Liam 42 framework:
--   8 domains : BODY, FUEL, METIME, USTIME, SHOT, LENS, NEST, ROOTS
--   5 phases  : GATE, STABILISE, BUILD, PERFORM, ELITE
--   365-day campaign (squad_pulses week_number extended to 52)

-- ─── user_domain_focuses ─────────────────────────────────────────────────────

alter table user_domain_focuses
  drop constraint if exists user_domain_focuses_domain_type_check;

alter table user_domain_focuses
  add constraint user_domain_focuses_domain_type_check
  check (domain_type in ('BODY','FUEL','METIME','USTIME','SHOT','LENS','NEST','ROOTS'));

-- ─── daily_check_ins ─────────────────────────────────────────────────────────

alter table daily_check_ins
  drop constraint if exists daily_check_ins_domain_type_check;

alter table daily_check_ins
  add constraint daily_check_ins_domain_type_check
  check (domain_type in ('BODY','FUEL','METIME','USTIME','SHOT','LENS','NEST','ROOTS'));

-- ─── user_streaks ────────────────────────────────────────────────────────────

alter table user_streaks
  drop constraint if exists user_streaks_domain_type_check;

alter table user_streaks
  add constraint user_streaks_domain_type_check
  check (domain_type in ('BODY','FUEL','METIME','USTIME','SHOT','LENS','NEST','ROOTS'));

-- ─── ai_nudges : domain_type ─────────────────────────────────────────────────

alter table ai_nudges
  drop constraint if exists ai_nudges_domain_type_check;

alter table ai_nudges
  add constraint ai_nudges_domain_type_check
  check (domain_type in ('BODY','FUEL','METIME','USTIME','SHOT','LENS','NEST','ROOTS'));

-- ─── ai_nudges : kairos_phase ────────────────────────────────────────────────

alter table ai_nudges
  drop constraint if exists ai_nudges_kairos_phase_check;

alter table ai_nudges
  add constraint ai_nudges_kairos_phase_check
  check (kairos_phase in ('GATE','STABILISE','BUILD','PERFORM','ELITE'));

-- ─── squads : kairos_phase ───────────────────────────────────────────────────

alter table squads
  drop constraint if exists squads_kairos_phase_check;

alter table squads
  add constraint squads_kairos_phase_check
  check (kairos_phase in ('GATE','STABILISE','BUILD','PERFORM','ELITE'));

-- ─── squad_pulses : week_number ──────────────────────────────────────────────
-- Extended from 12 to 52 to cover a full 365-day campaign.

alter table squad_pulses
  drop constraint if exists squad_pulses_week_number_check;

alter table squad_pulses
  add constraint squad_pulses_week_number_check
  check (week_number between 1 and 52);
