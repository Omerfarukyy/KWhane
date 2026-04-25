-- KWhane — Phase A: Electricity bill ingestion
-- Stores user-entered monthly bills so the AI advisor and predictions
-- can be grounded in real consumption instead of synthetic estimates.

CREATE TABLE IF NOT EXISTS public.electricity_bills (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  total_kwh      FLOAT NOT NULL,
  total_cost_tl  FLOAT NOT NULL,
  provider       TEXT,
  tariff_type    TEXT,
  source         TEXT NOT NULL DEFAULT 'manual',
  raw_payload    JSONB,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT bills_period_valid     CHECK (period_end >= period_start),
  CONSTRAINT bills_kwh_positive     CHECK (total_kwh >= 0),
  CONSTRAINT bills_cost_positive    CHECK (total_cost_tl >= 0),
  CONSTRAINT bills_user_period_uniq UNIQUE (user_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_bills_user_id     ON public.electricity_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_period ON public.electricity_bills(user_id, period_end DESC);

ALTER TABLE public.electricity_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY bills_user_policy ON public.electricity_bills
  FOR ALL USING (auth.uid() = user_id);
