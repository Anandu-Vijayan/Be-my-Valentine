-- If device_id is ever null on insert, use a unique generated value so the row is still saved.
-- Run in Supabase SQL Editor if you still see "null value in column device_id" errors.
alter table public.submissions alter column device_id set default gen_random_uuid()::text;
