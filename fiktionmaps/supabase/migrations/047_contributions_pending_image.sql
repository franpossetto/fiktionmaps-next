-- Pending images for contributions (e.g. add_photo) before moderator approval.
-- One row per (contribution, variant); role is repeated on each row for the same contribution.
CREATE TABLE public.contribution_pending_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('avatar', 'hero')),
  variant text NOT NULL CHECK (variant IN ('sm', 'lg')),
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_pending_images_contribution_variant_key UNIQUE (contribution_id, variant)
);

CREATE INDEX contribution_pending_images_contribution_id_idx
  ON public.contribution_pending_images (contribution_id);

COMMENT ON TABLE public.contribution_pending_images IS
  'Staging asset paths (asset-images bucket) until a contribution is approved; mirrors asset_images role + variant.';

-- RLS
ALTER TABLE public.contribution_pending_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_pending_images FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.contribution_pending_images TO authenticated;

CREATE POLICY "contribution_pending_images: select own contribution or staff"
  ON public.contribution_pending_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      WHERE c.id = contribution_id
        AND (c.user_id = (SELECT auth.uid()) OR public.is_staff_profile())
    )
  );

CREATE POLICY "contribution_pending_images: insert own pending contribution"
  ON public.contribution_pending_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      WHERE c.id = contribution_id
        AND c.user_id = (SELECT auth.uid())
        AND c.status = 'pending'
    )
  );

CREATE POLICY "contribution_pending_images: delete staff"
  ON public.contribution_pending_images
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());
