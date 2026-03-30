create table public.place_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  place_id   uuid references public.places(id),
  lat        decimal,
  lng        decimal,
  distance_m integer,
  verified   boolean,
  origin     text check (origin in ('gps', 'manual')),
  checked_at timestamp default now()
);

create index place_checkins_user_id_idx on public.place_checkins (user_id);
create index place_checkins_place_id_idx on public.place_checkins (place_id);
