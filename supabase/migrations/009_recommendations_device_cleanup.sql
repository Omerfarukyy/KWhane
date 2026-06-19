-- Remove legacy recommendation rows that no longer belong to a device.
DELETE FROM public.recommendations AS recommendation
WHERE recommendation.device_id IS NULL
   OR NOT EXISTS (
       SELECT 1
       FROM public.devices AS device
       WHERE device.id = recommendation.device_id
   );

-- Older environments may have created recommendations before migration 003,
-- so ensure device deletion cascades there as well.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS column_row
      ON column_row.attrelid = constraint_row.conrelid
     AND column_row.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = 'public.recommendations'::regclass
      AND constraint_row.confrelid = 'public.devices'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confdeltype = 'c'
      AND column_row.attname = 'device_id'
  ) THEN
    ALTER TABLE public.recommendations
      ADD CONSTRAINT recommendations_device_id_cascade_fkey
      FOREIGN KEY (device_id)
      REFERENCES public.devices(id)
      ON DELETE CASCADE;
  END IF;
END $$;
