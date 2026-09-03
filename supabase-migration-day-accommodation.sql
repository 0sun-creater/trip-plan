alter table public.days
  add column if not exists accommodation_name text default '',
  add column if not exists accommodation_url text default '';
