create table public.user_homes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  city_id    uuid references public.cities(id),
  date_from  date not null,
  date_to    date,
  created_at timestamp default now()
);

-- Enforce at most one current home (date_to IS NULL) per user
create unique index user_homes_one_current_idx
  on public.user_homes (user_id)
  where date_to is null;

create index user_homes_user_id_idx on public.user_homes (user_id);
