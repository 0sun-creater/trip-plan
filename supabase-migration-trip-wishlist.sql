create table if not exists public.trip_wishlist (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text,
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.trip_wishlist enable row level security;

grant select on public.trip_wishlist to anon, authenticated;
grant insert, update, delete on public.trip_wishlist to authenticated;

create policy "public read trip wishlist" on public.trip_wishlist
for select to anon, authenticated using (true);

create policy "owner insert trip wishlist" on public.trip_wishlist
for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.trips t
    where t.id = trip_id and t.owner_id = (select auth.uid())
  )
);

create policy "owner update trip wishlist" on public.trip_wishlist
for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "owner delete trip wishlist" on public.trip_wishlist
for delete to authenticated
using ((select auth.uid()) = owner_id);

create index if not exists idx_trip_wishlist_trip_created
  on public.trip_wishlist(trip_id, created_at);
