-- Free-world map: one RPC that aggregates places in the viewport into grid clusters.
-- Used when browse mode = world (zoom out). Clicking a cluster can enter that city.
--
-- Input:  bbox + grid size (degrees) + optional fiction filter + max clusters
-- Output: pins with count, dominant city, top fiction ids (covers resolved in app)
--
-- Also snaps bad geocodes (coords far from their city center) back to the city point.

CREATE OR REPLACE FUNCTION public.map_place_clusters(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_grid_deg double precision,
  p_fiction_ids uuid[] DEFAULT NULL,
  p_max_clusters integer DEFAULT 200
)
RETURNS TABLE (
  cluster_id text,
  lat double precision,
  lng double precision,
  place_count bigint,
  dominant_city_id uuid,
  dominant_share double precision,
  city_count bigint,
  fiction_total bigint,
  top_fiction_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH raw_pts AS (
    SELECT
      l.latitude AS raw_lat,
      l.longitude AS raw_lng,
      l.city_id,
      p.fiction_id,
      c.lat AS city_lat,
      c.lng AS city_lng
    FROM public.places p
    INNER JOIN public.locations l ON l.id = p.location_id
    LEFT JOIN public.cities c ON c.id = l.city_id
    WHERE p.active = true
      AND p.status = 'approved'
      AND l.latitude BETWEEN p_south AND p_north
      AND l.longitude BETWEEN p_west AND p_east
      AND (
        p_fiction_ids IS NULL
        OR cardinality(p_fiction_ids) = 0
        OR p.fiction_id = ANY (p_fiction_ids)
      )
  ),
  snapped AS (
    SELECT
      CASE
        WHEN city_id IS NOT NULL
          AND city_lat IS NOT NULL
          AND city_lng IS NOT NULL
          AND abs(raw_lat - city_lat) + abs(raw_lng - city_lng) > 2
        THEN city_lat
        ELSE raw_lat
      END AS latitude,
      CASE
        WHEN city_id IS NOT NULL
          AND city_lat IS NOT NULL
          AND city_lng IS NOT NULL
          AND abs(raw_lat - city_lat) + abs(raw_lng - city_lng) > 2
        THEN city_lng
        ELSE raw_lng
      END AS longitude,
      city_id,
      fiction_id
    FROM raw_pts
  ),
  bounded AS (
    SELECT *
    FROM snapped
    WHERE latitude BETWEEN p_south AND p_north
      AND longitude BETWEEN p_west AND p_east
      AND p_grid_deg > 0
  ),
  bucketed AS (
    SELECT
      floor(latitude / p_grid_deg) AS gy,
      floor(longitude / p_grid_deg) AS gx,
      count(*)::bigint AS place_count,
      avg(latitude) AS avg_lat,
      avg(longitude) AS avg_lng,
      mode() WITHIN GROUP (ORDER BY city_id) AS dominant_city_id,
      count(DISTINCT city_id)::bigint AS city_count,
      count(DISTINCT fiction_id)::bigint AS fiction_total
    FROM bounded
    GROUP BY 1, 2
  ),
  fiction_counts AS (
    SELECT
      floor(latitude / p_grid_deg) AS gy,
      floor(longitude / p_grid_deg) AS gx,
      fiction_id,
      count(*)::bigint AS cnt
    FROM bounded
    WHERE fiction_id IS NOT NULL
    GROUP BY 1, 2, 3
  ),
  fiction_ranked AS (
    SELECT
      gy,
      gx,
      fiction_id,
      row_number() OVER (PARTITION BY gy, gx ORDER BY cnt DESC, fiction_id) AS rn
    FROM fiction_counts
  ),
  top_fictions AS (
    SELECT
      gy,
      gx,
      array_agg(fiction_id ORDER BY rn) AS top_fiction_ids
    FROM fiction_ranked
    WHERE rn <= 5
    GROUP BY gy, gx
  )
  SELECT
    (b.gy::text || ':' || b.gx::text) AS cluster_id,
    CASE
      WHEN b.city_count = 1 AND c.lat IS NOT NULL THEN c.lat
      ELSE b.avg_lat
    END AS lat,
    CASE
      WHEN b.city_count = 1 AND c.lng IS NOT NULL THEN c.lng
      ELSE b.avg_lng
    END AS lng,
    b.place_count,
    b.dominant_city_id,
    CASE
      WHEN b.city_count <= 1 THEN 1::double precision
      ELSE 0::double precision
    END AS dominant_share,
    b.city_count,
    b.fiction_total,
    COALESCE(t.top_fiction_ids, ARRAY[]::uuid[]) AS top_fiction_ids
  FROM bucketed b
  LEFT JOIN public.cities c ON c.id = b.dominant_city_id
  LEFT JOIN top_fictions t ON t.gy = b.gy AND t.gx = b.gx
  ORDER BY b.place_count DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_max_clusters, 200), 500));
$$;

GRANT EXECUTE ON FUNCTION public.map_place_clusters(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  uuid[],
  integer
) TO anon, authenticated;
