-- Run this in Supabase Dashboard > SQL Editor

-- Table: names (options in the dropdown)
create table if not exists public.names (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Table: submissions (each selection; one per device per name; fingerprint limits incognito abuse)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  name_id uuid not null references public.names(id) on delete cascade,
  device_id text not null,
  device_info jsonb default '{}',
  fingerprint_hash text,
  submitted_at timestamptz default now(),
  unique (device_id, name_id)
);
-- One submission per (fingerprint_hash, name_id) when fingerprint is set (see migration add_fingerprint_hash.sql)

-- RLS: allow read names and insert submissions for anon
alter table public.names enable row level security;
alter table public.submissions enable row level security;

create policy "Names are viewable by everyone"
  on public.names for select
  using (true);

create policy "Anyone can insert names"
  on public.names for insert
  with check (true);

create policy "Anyone can insert submissions"
  on public.submissions for insert
  with check (true);

-- Admin reads submissions: use service role in app or protect admin route by secret.
-- This policy allows select for anon so the admin page (server-side with secret check) can read.
create policy "Submissions readable for stats"
  on public.submissions for select
  using (true);

-- Seed a few names (run after tables exist)
insert into public.names (name) values
  ('Alex'),
  ('Jordan'),
  ('Sam'),
  ('Taylor'),
  ('Casey')
on conflict (name) do nothing;
