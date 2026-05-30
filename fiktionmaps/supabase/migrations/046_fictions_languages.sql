ALTER TABLE public.fictions
  ADD COLUMN original_language text NULL,
  ADD COLUMN content_language text NULL;

COMMENT ON COLUMN public.fictions.original_language IS 'ISO 639-1 language of the work (movie/book/series).';
COMMENT ON COLUMN public.fictions.content_language IS 'ISO 639-1 language of catalog text (title, description).';
