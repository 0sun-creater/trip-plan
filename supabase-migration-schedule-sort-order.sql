alter table public.schedules
  add column if not exists sort_order integer;

create index if not exists schedules_day_sort_order_idx
  on public.schedules(day_id, sort_order, created_at);

with ranked as (
  select id,
         row_number() over (partition by day_id order by created_at, id) * 10 as rn
  from public.schedules
  where sort_order is null
)
update public.schedules s
set sort_order = ranked.rn
from ranked
where s.id = ranked.id;
