-- Limit abuse from incognito/different browser: same browser fingerprint can only submit once per name.
-- fingerprint_hash is derived server-side from User-Agent, Accept-Language, Sec-CH-UA* (optional: FINGERPRINT_SECRET in env).

alter table public.submissions
  add column if not exists fingerprint_hash text;

-- One submission per (fingerprint, name_id). Null fingerprint_hash (e.g. old rows or no headers) is not constrained.
create unique index if not exists submissions_fingerprint_name_unique
  on public.submissions (fingerprint_hash, name_id)
  where fingerprint_hash is not null;
