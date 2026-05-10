-- Allow moderator role for contribution moderation (was user | admin only)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'moderator'));

-- 1. ENUMS
CREATE TYPE contribution_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE contribution_type AS ENUM (
  'create_fiction',
  'create_place',
  'add_scene',
  'add_photo',
  'enrich_entity',
  'correct_data',
  'mark_inaccessible',
  'add_tip',
  'checkin'
);

CREATE TYPE contribution_entity_type AS ENUM (
  'fiction',
  'place',
  'scene'
);

-- 2. ALTER existing tables — add status and created_by
ALTER TABLE fictions
  ADD COLUMN status contribution_status NOT NULL DEFAULT 'approved',
  ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE places
  ADD COLUMN status contribution_status NOT NULL DEFAULT 'approved',
  ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE scenes
  ADD COLUMN status contribution_status NOT NULL DEFAULT 'approved';

-- scenes already has created_by

-- 3. ALTER profiles — add FPP and level tracking
ALTER TABLE profiles
  ADD COLUMN fpp_total integer NOT NULL DEFAULT 0,
  ADD COLUMN level integer NOT NULL DEFAULT 1;

-- 4. CONTRIBUTIONS table
CREATE TABLE contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type contribution_type NOT NULL,
  entity_type contribution_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  status contribution_status NOT NULL DEFAULT 'pending',
  moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_note text NULL,
  fpp_awarded integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. INDEXES
CREATE INDEX contributions_user_id_idx ON contributions(user_id);
CREATE INDEX contributions_status_idx ON contributions(status);
CREATE INDEX contributions_entity_idx ON contributions(entity_type, entity_id);

-- 6. Auto-update updated_at on contribution updates
DROP TRIGGER IF EXISTS set_contributions_updated_at ON public.contributions;

CREATE TRIGGER set_contributions_updated_at
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
