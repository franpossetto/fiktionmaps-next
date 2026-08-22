-- Manual admin emails: welcome send path (queue → dispatch → persist).
-- Slice 1 creates suppressions table empty for Slice 2; no public unsubscribe yet.

-- ---------------------------------------------------------------------------
-- is_admin_profile(): mirror of is_staff_profile(), admin only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_profile()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_profile() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- email_suppressions (created now, used in Slice 2)
-- ---------------------------------------------------------------------------
CREATE TABLE public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email_type text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_suppressions_email_type_check
    CHECK (email_type IN ('welcome', '*')),
  CONSTRAINT email_suppressions_user_type_unique
    UNIQUE (user_id, email_type)
);

CREATE INDEX email_suppressions_user_id_idx
  ON public.email_suppressions (user_id);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.email_suppressions TO authenticated;

CREATE POLICY "email_suppressions: admin all"
  ON public.email_suppressions
  FOR ALL
  TO authenticated
  USING (public.is_admin_profile())
  WITH CHECK (public.is_admin_profile());

CREATE POLICY "email_suppressions: select own"
  ON public.email_suppressions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- email_batches
-- ---------------------------------------------------------------------------
CREATE TABLE public.email_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  subject text NOT NULL,
  custom_message text NOT NULL,
  template_props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  dry_run boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_batches_email_type_check
    CHECK (email_type IN ('welcome')),
  CONSTRAINT email_batches_source_check
    CHECK (source IN ('manual', 'system')),
  CONSTRAINT email_batches_status_check
    CHECK (status IN ('queued', 'dispatching', 'done', 'failed')),
  CONSTRAINT email_batches_custom_message_len_check
    CHECK (char_length(custom_message) <= 1000)
);

CREATE TRIGGER set_email_batches_updated_at
  BEFORE UPDATE ON public.email_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.email_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_batches FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.email_batches TO authenticated;

CREATE POLICY "email_batches: admin all"
  ON public.email_batches
  FOR ALL
  TO authenticated
  USING (public.is_admin_profile())
  WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- email_sends
-- ---------------------------------------------------------------------------
CREATE TABLE public.email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.email_batches (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  email_type text NOT NULL,
  email_to text NOT NULL,
  name_to text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error text,
  attempts int NOT NULL DEFAULT 0,
  resend_message_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_sends_email_type_check
    CHECK (email_type IN ('welcome')),
  CONSTRAINT email_sends_status_check
    CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  CONSTRAINT email_sends_batch_user_unique
    UNIQUE (batch_id, user_id)
);

CREATE INDEX email_sends_user_email_type_idx
  ON public.email_sends (user_id, email_type);

CREATE INDEX email_sends_batch_status_idx
  ON public.email_sends (batch_id, status);

CREATE INDEX email_sends_created_at_desc_idx
  ON public.email_sends (created_at DESC);

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.email_sends TO authenticated;

CREATE POLICY "email_sends: admin all"
  ON public.email_sends
  FOR ALL
  TO authenticated
  USING (public.is_admin_profile())
  WITH CHECK (public.is_admin_profile());

-- ---------------------------------------------------------------------------
-- Directory RPCs (auth.users + profiles, admin JWT only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_search_email_recipients(
  q text,
  filter text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  full_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_q text := coalesce(trim(q), '');
  v_pattern text;
  v_filter text := filter;
BEGIN
  IF NOT public.is_admin_profile() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_filter IS NULL OR v_filter NOT IN ('all', 'new_7d', 'no_welcome_sent') THEN
    RAISE EXCEPTION 'invalid filter' USING ERRCODE = '22023';
  END IF;

  -- Escape ILIKE wildcards in user input.
  v_pattern := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.username,
    p.full_name,
    p.created_at
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE
    u.email IS NOT NULL
    AND (
      v_q = ''
      OR u.email ILIKE v_pattern ESCAPE '\'
      OR coalesce(p.username, '') ILIKE v_pattern ESCAPE '\'
      OR coalesce(p.full_name, '') ILIKE v_pattern ESCAPE '\'
    )
    AND (
      v_filter = 'all'
      OR (v_filter = 'new_7d' AND p.created_at >= (now() AT TIME ZONE 'utc') - interval '7 days')
      OR (
        v_filter = 'no_welcome_sent'
        AND NOT EXISTS (
          SELECT 1
          FROM public.email_sends es
          WHERE es.user_id = p.id
            AND es.email_type = 'welcome'
            AND es.status = 'sent'
        )
      )
    )
  ORDER BY p.created_at DESC
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_email_recipients(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_email_recipients(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_email_recipients(ids uuid[])
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  full_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_admin_profile() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.username,
    p.full_name
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE p.id = ANY (ids)
    AND u.email IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_email_recipients(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_email_recipients(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- queue_email_batch: atomic batch + send (Slice 1: one recipient)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.queue_email_batch(
  p_email_type text,
  p_subject text,
  p_custom_message text,
  p_template_props jsonb,
  p_created_by uuid,
  p_source text,
  p_dry_run boolean,
  p_recipients jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_batch_id uuid;
  v_recipient jsonb;
  v_user_id uuid;
  v_email_to text;
  v_name_to text;
  v_send_status text;
  v_send_error text;
  v_count int;
BEGIN
  IF NOT public.is_admin_profile() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_email_type IS DISTINCT FROM 'welcome' THEN
    RAISE EXCEPTION 'invalid email_type' USING ERRCODE = '22023';
  END IF;

  IF p_source IS NULL OR p_source NOT IN ('manual', 'system') THEN
    RAISE EXCEPTION 'invalid source' USING ERRCODE = '22023';
  END IF;

  IF p_created_by IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'created_by must match auth.uid()' USING ERRCODE = '42501';
  END IF;

  IF p_recipients IS NULL OR jsonb_typeof(p_recipients) <> 'array' THEN
    RAISE EXCEPTION 'recipients must be a json array' USING ERRCODE = '22023';
  END IF;

  v_count := jsonb_array_length(p_recipients);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'exactly one recipient required' USING ERRCODE = '22023';
  END IF;

  v_recipient := p_recipients -> 0;
  v_user_id := (v_recipient ->> 'user_id')::uuid;
  v_email_to := nullif(trim(v_recipient ->> 'email_to'), '');
  v_name_to := nullif(trim(v_recipient ->> 'name_to'), '');

  IF v_user_id IS NULL OR v_email_to IS NULL OR v_name_to IS NULL THEN
    RAISE EXCEPTION 'invalid recipient payload' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.email_sends es
    WHERE es.user_id = v_user_id
      AND es.email_type = 'welcome'
      AND es.status = 'sent'
  ) THEN
    RAISE EXCEPTION 'welcome already sent for user' USING ERRCODE = '23505';
  END IF;

  IF coalesce(p_dry_run, false) THEN
    v_send_status := 'skipped';
    v_send_error := 'dry_run';
  ELSE
    v_send_status := 'queued';
    v_send_error := NULL;
  END IF;

  INSERT INTO public.email_batches (
    email_type,
    subject,
    custom_message,
    template_props,
    created_by,
    source,
    status,
    dry_run
  )
  VALUES (
    p_email_type,
    p_subject,
    coalesce(p_custom_message, ''),
    coalesce(p_template_props, '{}'::jsonb),
    p_created_by,
    p_source,
    'queued',
    coalesce(p_dry_run, false)
  )
  RETURNING id INTO v_batch_id;

  INSERT INTO public.email_sends (
    batch_id,
    user_id,
    email_type,
    email_to,
    name_to,
    status,
    error
  )
  VALUES (
    v_batch_id,
    v_user_id,
    p_email_type,
    v_email_to,
    v_name_to,
    v_send_status,
    v_send_error
  );

  RETURN v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_email_batch(
  text, text, text, jsonb, uuid, text, boolean, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_email_batch(
  text, text, text, jsonb, uuid, text, boolean, jsonb
) TO authenticated;
