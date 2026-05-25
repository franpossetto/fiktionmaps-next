-- Immersive street-level view references (e.g. Google Street View) anchored to a location.
CREATE TABLE IF NOT EXISTS public.location_view_references (
  id                 UUID             NOT NULL DEFAULT gen_random_uuid(),
  location_id        UUID             NOT NULL,
  provider           TEXT             NOT NULL DEFAULT 'google_street_view',
  camera_latitude    DOUBLE PRECISION NOT NULL,
  camera_longitude   DOUBLE PRECISION NOT NULL,
  heading            DOUBLE PRECISION NOT NULL,
  pitch              DOUBLE PRECISION NOT NULL,
  fov                DOUBLE PRECISION NOT NULL,
  external_pano_id   TEXT,
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT location_view_references_pkey PRIMARY KEY (id),
  CONSTRAINT location_view_references_location_id_key UNIQUE (location_id),
  CONSTRAINT location_view_references_location_id_fkey
    FOREIGN KEY (location_id) REFERENCES public.locations (id)
    ON DELETE CASCADE,
  CONSTRAINT location_view_references_heading_range
    CHECK (heading >= 0 AND heading < 360),
  CONSTRAINT location_view_references_pitch_range
    CHECK (pitch >= -90 AND pitch <= 90),
  CONSTRAINT location_view_references_fov_range
    CHECK (fov >= 10 AND fov <= 120)
);

COMMENT ON TABLE public.location_view_references IS
  'External immersive view for a location (e.g. Google Street View camera pose).';
COMMENT ON COLUMN public.location_view_references.provider IS
  'Provider slug, e.g. google_street_view.';
COMMENT ON COLUMN public.location_view_references.external_pano_id IS
  'Provider-native panorama id (Google panoId).';
COMMENT ON COLUMN public.location_view_references.camera_latitude IS
  'Street-level camera position (often differs from locations.latitude).';

CREATE INDEX IF NOT EXISTS idx_location_view_references_location_id
  ON public.location_view_references (location_id);

DROP TRIGGER IF EXISTS set_location_view_references_updated_at ON public.location_view_references;

CREATE TRIGGER set_location_view_references_updated_at
  BEFORE UPDATE ON public.location_view_references
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT ON public.location_view_references TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_view_references TO authenticated;

ALTER TABLE public.location_view_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_view_references FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "location_view_references: anyone can read" ON public.location_view_references;
CREATE POLICY "location_view_references: anyone can read"
  ON public.location_view_references
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "location_view_references: authenticated can write" ON public.location_view_references;
CREATE POLICY "location_view_references: authenticated can write"
  ON public.location_view_references
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
