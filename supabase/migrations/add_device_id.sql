-- Run this if you already have submissions without device_id (adds column and enforces one vote per device per name)

-- Add column (nullable first for existing rows)
alter table public.submissions add column if not exists device_id text;

-- Backfill: give each existing row a unique device_id so the unique constraint can be added
update public.submissions set device_id = gen_random_uuid()::text where device_id is null;

-- Enforce not null and add unique constraint
alter table public.submissions alter column device_id set not null;
alter table public.submissions add constraint submissions_device_name_unique unique (device_id, name_id);
