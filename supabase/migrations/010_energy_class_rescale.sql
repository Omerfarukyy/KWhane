-- Flatten saved devices onto the applicable post-2021 efficiency scales.
UPDATE public.devices
SET efficiency_class = 'A'
WHERE type <> 'ac';

UPDATE public.devices
SET efficiency_class = 'A+++'
WHERE type = 'ac';

UPDATE public.device_catalog
SET efficiency_class = 'A'
WHERE type <> 'ac';

UPDATE public.device_catalog
SET efficiency_class = 'A+++'
WHERE type = 'ac';
