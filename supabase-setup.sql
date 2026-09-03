-- Travel Planner schema + RLS
create extension if not exists pgcrypto;

create table if not exists public.trips (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users(id) on delete cascade,
	title text not null,
	start_date date not null,
	end_date date not null,
	route text default '',
	summary text default '',
	created_at timestamptz not null default now()
);

create table if not exists public.days (
	id uuid primary key default gen_random_uuid(),
	trip_id uuid not null references public.trips(id) on delete cascade,
	owner_id uuid not null references auth.users(id) on delete cascade,
	date date not null,
	place text default '',
	title text not null,
	summary text default '',
	notes text default '',
	created_at timestamptz not null default now()
);

create table if not exists public.schedules (
	id uuid primary key default gen_random_uuid(),
	day_id uuid not null references public.days(id) on delete cascade,
	owner_id uuid not null references auth.users(id) on delete cascade,
	time time,
	title text not null,
	place text default '',
	detail text default '',
	map_url text,
	created_at timestamptz not null default now()
);

alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.schedules enable row level security;

grant select on public.trips, public.days, public.schedules to anon, authenticated;
grant insert, update, delete on public.trips, public.days, public.schedules to authenticated;

create policy "public read trips" on public.trips for select to anon, authenticated using (true);
create policy "owner insert trips" on public.trips for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owner update trips" on public.trips for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner delete trips" on public.trips for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "public read days" on public.days for select to anon, authenticated using (true);
create policy "owner insert days" on public.days for insert to authenticated
with check ((select auth.uid()) = owner_id and exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())));
create policy "owner update days" on public.days for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner delete days" on public.days for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "public read schedules" on public.schedules for select to anon, authenticated using (true);
create policy "owner insert schedules" on public.schedules for insert to authenticated
with check ((select auth.uid()) = owner_id and exists(select 1 from public.days d where d.id=day_id and d.owner_id=(select auth.uid())));
create policy "owner update schedules" on public.schedules for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner delete schedules" on public.schedules for delete to authenticated using ((select auth.uid()) = owner_id);

create index if not exists idx_days_trip_date on public.days(trip_id,date);
create index if not exists idx_schedules_day_time on public.schedules(day_id,time);
