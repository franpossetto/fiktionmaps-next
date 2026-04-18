create table public.city_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  city_id    uuid references public.cities(id),
  lat        decimal,
  lng        decimal,
  origin     text check (origin in ('auto', 'manual')),
  checked_at timestamp default now()
);

create index city_checkins_user_id_idx on public.city_checkins (user_id);
create index city_checkins_city_id_idx on public.city_checkins (city_id);

-- Prevent duplicate same-day checkins per user per city
create unique index city_checkins_user_city_day_idx
  on public.city_checkins (user_id, city_id, (checked_at::date));
