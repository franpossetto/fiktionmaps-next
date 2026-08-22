CREATE TYPE place_relation_kind AS ENUM (
  'filmed',
  'featured',
  'mentioned',
  'inspired_by',
  'related_to'
);

ALTER TABLE public.places
  ADD COLUMN relation_kind place_relation_kind NOT NULL DEFAULT 'filmed';

COMMENT ON COLUMN public.places.relation_kind IS
  'How this place relates to its fiction: filmed, featured in the story, mentioned, inspired the work, or related in the real world.';
