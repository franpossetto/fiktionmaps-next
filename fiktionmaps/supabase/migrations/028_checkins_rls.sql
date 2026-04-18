-- ============================================================
-- user_homes RLS
-- ============================================================

alter table public.user_homes enable row level security;
alter table public.user_homes force row level security;

create policy "user_homes: users can view own"
  on public.user_homes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_homes: users can insert own"
  on public.user_homes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_homes: users can update own"
  on public.user_homes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_homes: users can delete own"
  on public.user_homes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- city_checkins RLS
-- ============================================================

alter table public.city_checkins enable row level security;
alter table public.city_checkins force row level security;

create policy "city_checkins: users can view own"
  on public.city_checkins for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "city_checkins: users can insert own"
  on public.city_checkins for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "city_checkins: users can update own"
  on public.city_checkins for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "city_checkins: users can delete own"
  on public.city_checkins for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- place_checkins RLS
-- ============================================================

alter table public.place_checkins enable row level security;
alter table public.place_checkins force row level security;

create policy "place_checkins: users can view own"
  on public.place_checkins for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "place_checkins: users can insert own"
  on public.place_checkins for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "place_checkins: users can update own"
  on public.place_checkins for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "place_checkins: users can delete own"
  on public.place_checkins for delete
  to authenticated
  using ((select auth.uid()) = user_id);
