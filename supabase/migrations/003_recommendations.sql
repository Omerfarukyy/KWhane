-- KWhane — Recommendations table
-- Run this in the Supabase SQL Editor.
-- The indices and RLS policy in 001_alter_schema.sql already reference this
-- table; this migration provides the missing CREATE TABLE plus the title /
-- description columns the frontend (SuggestionCards) and ML backend rely on.

CREATE TABLE IF NOT EXISTS public.recommendations (
  id                       BIGSERIAL PRIMARY KEY,
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id                UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  slug                     TEXT NOT NULL,
  category                 TEXT NOT NULL,
  title                    TEXT,
  description              TEXT,
  current_monthly_cost     NUMERIC NOT NULL DEFAULT 0,
  projected_monthly_cost   NUMERIC NOT NULL DEFAULT 0,
  potential_savings_amount NUMERIC NOT NULL DEFAULT 0,
  status                   TEXT NOT NULL DEFAULT 'pending',
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- Backfill missing columns if the table already exists from an earlier env
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS title       TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;
