-- KWhane - usage context, device-aware recommendations, and bill scale metadata.
-- Safe to run once in Supabase SQL Editor. Columns are additive.

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS usage_basis TEXT NOT NULL DEFAULT 'hours',
  ADD COLUMN IF NOT EXISTS cycles_per_week DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS cycle_hours DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS calculation_mode TEXT NOT NULL DEFAULT 'default';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'devices_usage_basis_check'
      AND conrelid = 'public.devices'::regclass
  ) THEN
    ALTER TABLE public.devices
      ADD CONSTRAINT devices_usage_basis_check
      CHECK (usage_basis IN ('hours', 'cycles'));
  END IF;
END $$;

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS current_monthly_kwh NUMERIC,
  ADD COLUMN IF NOT EXISTS projected_monthly_kwh NUMERIC,
  ADD COLUMN IF NOT EXISTS recommendation_source TEXT NOT NULL DEFAULT 'rule_based',
  ADD COLUMN IF NOT EXISTS explanation_factors JSONB;

ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS billing_scale_factor DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS billing_scale_bill_count INTEGER,
  ADD COLUMN IF NOT EXISTS billing_scale_actual_kwh DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS billing_scale_predicted_kwh DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS billing_scale_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_savings
  ON public.recommendations (user_id, potential_savings_amount DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_device
  ON public.recommendations (device_id);

-- Backfill legacy cycle-based devices. Existing frontend stored weekly-cycle
-- choices as effective daily_usage_hours; this reconstructs the weekly value.
UPDATE public.devices
SET
  usage_basis = 'cycles',
  cycle_hours = CASE type
    WHEN 'washing_machine' THEN 1.5
    WHEN 'dishwasher' THEN 2.0
    WHEN 'dryer' THEN 1.25
    WHEN 'oven' THEN 1.0
    ELSE cycle_hours
  END,
  cycles_per_week = CASE type
    WHEN 'washing_machine' THEN daily_usage_hours * 7.0 / 1.5
    WHEN 'dishwasher' THEN daily_usage_hours * 7.0 / 2.0
    WHEN 'dryer' THEN daily_usage_hours * 7.0 / 1.25
    WHEN 'oven' THEN daily_usage_hours * 7.0 / 1.0
    ELSE cycles_per_week
  END
WHERE type IN ('washing_machine', 'dishwasher', 'dryer', 'oven')
  AND cycles_per_week IS NULL
  AND daily_usage_hours > 0;
