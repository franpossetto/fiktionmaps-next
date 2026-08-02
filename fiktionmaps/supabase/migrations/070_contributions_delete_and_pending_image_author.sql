-- Allow contribution authors to replace staged pending images (idempotent add_photo).
-- Allow staff (admin/moderator) to hard-delete pending/rejected contribution rows for DB cleanup.

CREATE POLICY "contribution_pending_images: delete own pending contribution"
  ON public.contribution_pending_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      WHERE c.id = contribution_id
        AND c.user_id = (SELECT auth.uid())
        AND c.status = 'pending'
    )
  );

GRANT DELETE ON public.contributions TO authenticated;

CREATE POLICY "contributions: delete staff pending or rejected"
  ON public.contributions
  FOR DELETE
  TO authenticated
  USING (
    public.is_staff_profile()
    AND status IN ('pending', 'rejected')
  );
