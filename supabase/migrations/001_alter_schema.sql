-- KWhane — Phase 2 Schema Alterations
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to run: uses IF NOT EXISTS / IF NOT CONSTRAINT where possible

-- ── 1. homes: enforce one home per user ──────────────────────────────────────
ALTER TABLE public.homes
  ADD CONSTRAINT homes_user_id_unique UNIQUE (user_id);

-- ── 2. rooms: add 3D position columns for scene layout restoration ────────────
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS position_x FLOAT NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS position_z FLOAT NOT NULL DEFAULT 0.0;

-- ── 3. device_catalog: add columns expected by DeviceCatalogModal & ML backend
ALTER TABLE public.device_catalog
  ADD COLUMN IF NOT EXISTS daily_usage_hours   FLOAT NOT NULL DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS standby_power_watts INT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS year_of_purchase    INT;

-- ── 4. device_calculations: written by n8n after each /calculate call ─────────
CREATE TABLE IF NOT EXISTS public.device_calculations (
  id                      BIGSERIAL PRIMARY KEY,
  device_id               UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  theoretical_monthly_kwh FLOAT NOT NULL DEFAULT 0,
  real_monthly_kwh        FLOAT NOT NULL DEFAULT 0,
  standby_monthly_kwh     FLOAT NOT NULL DEFAULT 0,
  total_monthly_kwh       FLOAT NOT NULL DEFAULT 0,
  total_monthly_cost      FLOAT NOT NULL DEFAULT 0,
  efficiency_score        FLOAT NOT NULL DEFAULT 0,
  tariff_breakdown        JSONB,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- ── 5. device_comparisons: written by n8n after each /compare call ────────────
CREATE TABLE IF NOT EXISTS public.device_comparisons (
  id                      BIGSERIAL PRIMARY KEY,
  device_id               UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  cluster_id              INT  NOT NULL DEFAULT 0,
  cluster_size            INT  NOT NULL DEFAULT 0,
  user_monthly_kwh        FLOAT NOT NULL DEFAULT 0,
  cluster_avg_monthly_kwh FLOAT NOT NULL DEFAULT 0,
  percentile              INT  NOT NULL DEFAULT 50,
  comparison_label        TEXT NOT NULL DEFAULT 'average',
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- ── 6. Performance indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_homes_user_id    ON public.homes(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_home_id    ON public.rooms(home_id);
CREATE INDEX IF NOT EXISTS idx_devices_room_id  ON public.devices(room_id);
CREATE INDEX IF NOT EXISTS idx_device_calc_dev  ON public.device_calculations(device_id);
CREATE INDEX IF NOT EXISTS idx_device_comp_dev  ON public.device_comparisons(device_id);
CREATE INDEX IF NOT EXISTS idx_recs_user_id     ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recs_device_id   ON public.recommendations(device_id);

-- ── 7. Enable Row Level Security on all tables ────────────────────────────────
ALTER TABLE public.homes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_comparisons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_catalog      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_tariffs ENABLE ROW LEVEL SECURITY;

-- ── 8. RLS Policies ───────────────────────────────────────────────────────────

-- homes: authenticated user can only access their own home
CREATE POLICY homes_user_policy ON public.homes
  FOR ALL USING (auth.uid() = user_id);

-- rooms: access via homes.user_id join
CREATE POLICY rooms_user_policy ON public.rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE homes.id = rooms.home_id
        AND homes.user_id = auth.uid()
    )
  );

-- devices: access via rooms → homes chain
CREATE POLICY devices_user_policy ON public.devices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      JOIN public.homes ON homes.id = rooms.home_id
      WHERE rooms.id = devices.room_id
        AND homes.user_id = auth.uid()
    )
  );

-- device_calculations: access via devices → rooms → homes
CREATE POLICY device_calc_user_policy ON public.device_calculations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.devices
      JOIN public.rooms  ON rooms.id  = devices.room_id
      JOIN public.homes  ON homes.id  = rooms.home_id
      WHERE devices.id = device_calculations.device_id
        AND homes.user_id = auth.uid()
    )
  );

-- device_comparisons: same chain as device_calculations
CREATE POLICY device_comp_user_policy ON public.device_comparisons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.devices
      JOIN public.rooms  ON rooms.id  = devices.room_id
      JOIN public.homes  ON homes.id  = rooms.home_id
      WHERE devices.id = device_comparisons.device_id
        AND homes.user_id = auth.uid()
    )
  );

-- recommendations: has denormalized user_id column
CREATE POLICY recommendations_user_policy ON public.recommendations
  FOR ALL USING (auth.uid() = user_id);

-- device_catalog: public read (product catalog, not user data)
CREATE POLICY device_catalog_public ON public.device_catalog
  FOR SELECT USING (TRUE);

-- electricity_tariffs: public read
CREATE POLICY tariffs_public ON public.electricity_tariffs
  FOR SELECT USING (TRUE);
