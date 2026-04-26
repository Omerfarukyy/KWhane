-- KWhane — Phase C: device calibration audit columns
-- Run this in the Supabase SQL Editor.
--
-- Phase C surfaces a "your predictions ran X% low/high over the last N bills,
-- want to update your declared hours?" suggestion. To keep the calibration
-- loop honest we need to know:
--   • which devices have been user-confirmed-calibrated (vs catalog defaults)
--   • the original declared value before any calibration was accepted
--
-- Both columns are nullable — devices that have never been calibrated stay
-- as they are. RLS already covers the devices table via room → home → user.

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS daily_usage_hours_original FLOAT,
  ADD COLUMN IF NOT EXISTS usage_hours_calibrated_at  TIMESTAMPTZ;

-- Lookup index for "devices calibrated in the last N days" queries (rare but cheap).
CREATE INDEX IF NOT EXISTS idx_devices_calibrated_at
  ON public.devices (usage_hours_calibrated_at)
  WHERE usage_hours_calibrated_at IS NOT NULL;
