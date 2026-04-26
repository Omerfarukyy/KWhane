-- KWhane — Phase E: monthly energy-saving goals
-- Run this in the Supabase SQL Editor.
--
-- One row per user per period (typically a calendar month). RLS ensures users
-- only see / mutate their own goals. The unique index prevents accidental
-- duplicate goals for the same exact window.

CREATE TABLE IF NOT EXISTS public.goals (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kwh    FLOAT NOT NULL CHECK (target_kwh > 0),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CHECK (period_end > period_start)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_user_policy ON public.goals
  FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lookup by user, newest period first (StreakCard fetches the active goal).
CREATE INDEX IF NOT EXISTS idx_goals_user_period
  ON public.goals (user_id, period_end DESC);

-- One goal per (user, exact window). Lets us upsert by (user_id, period_start, period_end).
CREATE UNIQUE INDEX IF NOT EXISTS goals_user_period_uniq
  ON public.goals (user_id, period_start, period_end);
