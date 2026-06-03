-- Staff contributions feed: status + recency ordering
CREATE INDEX IF NOT EXISTS contributions_status_created_at_idx
  ON public.contributions (status, created_at DESC);

-- Staff feed filters by entity/type + status + recency
CREATE INDEX IF NOT EXISTS contributions_entity_type_status_created_at_idx
  ON public.contributions (entity_type, type, status, created_at DESC);

-- Top contributors sidebar: profiles.fpp_total ranking
CREATE INDEX IF NOT EXISTS profiles_fpp_total_desc_idx
  ON public.profiles (fpp_total DESC)
  WHERE fpp_total > 0;
