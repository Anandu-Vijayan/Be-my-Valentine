-- Delete submissions where device name is "Poda" (case-insensitive).
-- Run this in Supabase SQL Editor to clean existing data.

DELETE FROM public.submissions
WHERE lower(device_info->>'deviceName') = 'poda';
