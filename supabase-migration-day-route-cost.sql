-- Run this once in Supabase SQL Editor for an existing Travel Planner database.
-- It is safe to run again because IF NOT EXISTS is used.

alter table public.schedules
	add column if not exists time_label text default '',
	add column if not exists cost text default '';
