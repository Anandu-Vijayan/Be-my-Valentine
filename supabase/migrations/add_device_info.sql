-- Add device_info to store user/device data (user agent, language, timezone, etc.)
alter table public.submissions add column if not exists device_info jsonb default '{}';
