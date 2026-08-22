-- Allow admins to delete stuck / failed email history (RLS already FOR ALL via is_admin_profile).
GRANT DELETE ON public.email_batches TO authenticated;
GRANT DELETE ON public.email_sends TO authenticated;
