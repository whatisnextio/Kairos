-- Fix xp_awarded default on cycle_reflections: 50 was wrong; XP_PER_CYCLE_COMPLETE = 500
ALTER TABLE cycle_reflections ALTER COLUMN xp_awarded SET DEFAULT 500;
