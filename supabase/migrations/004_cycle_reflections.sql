-- Cycle reflections: Day 84 written reflection on cycle completion
CREATE TABLE IF NOT EXISTS cycle_reflections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cycle_id      UUID NOT NULL REFERENCES kairos_cycles(id) ON DELETE CASCADE,
  reflection_text TEXT NOT NULL,
  xp_awarded    INTEGER NOT NULL DEFAULT 50,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_id)
);

ALTER TABLE cycle_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reflections"
  ON cycle_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections"
  ON cycle_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
