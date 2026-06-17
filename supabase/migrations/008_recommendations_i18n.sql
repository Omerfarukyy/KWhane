-- KWhane — Add English translation columns to recommendations
-- The ML backend now generates title/description in both TR and EN.
-- Frontend picks the correct column based on the active UI language.

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS title_en       TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;
