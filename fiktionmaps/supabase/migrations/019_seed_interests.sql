BEGIN;

WITH seed(key, en_label, es_label) AS (
  VALUES
    ('genre-action','Action','Acción'),
    ('genre-adventure','Adventure','Aventura'),
    ('genre-comedy','Comedy','Comedia'),
    ('genre-drama','Drama','Drama'),
    ('genre-romance','Romance','Romance'),
    ('genre-thriller','Thriller','Thriller'),
    ('genre-horror','Horror','Terror'),
    ('genre-sci-fi','Sci-Fi','Ciencia ficción'),
    ('genre-fantasy','Fantasy','Fantasía'),
    ('genre-documentary','Documentary','Documental'),
    ('genre-crime','Crime','Crimen'),
    ('genre-animation','Animation','Animación'),

    ('story-heist','Heist','Atraco'),
    ('story-revenge','Revenge','Venganza'),
    ('story-mystery','Mystery','Misterio'),
    ('story-crime','Crime','Crimen'),
    ('story-survival','Survival','Supervivencia'),
    ('story-quest','Quest','Búsqueda'),
    ('story-love-story','Love Story','Historia de amor'),
    ('story-coming-of-age','Coming of Age','Llegar a la adultez'),
    ('story-war','War','Guerra'),
    ('story-rivalry','Rivalry','Rivalidad'),
    ('story-redemption','Redemption','Redención'),
    ('story-betrayal','Betrayal','Traición'),
    ('story-investigation','Investigation','Investigación'),
    ('story-escape','Escape','Evasión'),
    ('story-journey','Journey','Viaje'),
    ('story-transformation','Transformation','Transformación'),
    ('story-power-struggle','Power Struggle','Lucha por el poder'),
    ('story-hero','Hero','Héroe'),
    ('story-vampires','Vampires','Vampiros'),
    ('story-zombies','Zombies','Zombis'),

    ('setting-city','City','Ciudad'),
    ('setting-small-town','Small Town','Pueblo pequeño'),
    ('setting-space','Space','Espacio'),
    ('setting-fantasy-world','Fantasy World','Mundo de fantasía'),
    ('setting-post-apocalyptic','Post-Apocalyptic','Postapocalipsis'),
    ('setting-historical','Historical','Histórico'),
    ('setting-modern','Modern','Moderno'),
    ('setting-island','Island','Isla'),
    ('setting-road','Road','Carretera'),
    ('setting-underworld','Underworld','Inframundo'),
    ('setting-world-war-2','World War II','Segunda Guerra Mundial'),
    ('setting-medieval','Medieval','Medieval'),
    ('setting-dystopian','Dystopian','Distópico'),

    ('format-live-action','Live Action','Acción real'),
    ('format-animation','Animation','Animación'),
    ('format-anime','Anime','Anime')
),

-- 1) interests catalog
ins_interests AS (
  INSERT INTO public.interests (key, category, active)
  SELECT
    s.key,
    split_part(s.key, '-', 1) AS category,
    true AS active
  FROM seed s
  ON CONFLICT (key) DO UPDATE
  SET
    category = EXCLUDED.category,
    active = EXCLUDED.active
  RETURNING 1
)
SELECT 1;

-- 2) translations: en
WITH seed(key, en_label, es_label) AS (
  VALUES
    ('genre-action','Action','Acción'),
    ('genre-adventure','Adventure','Aventura'),
    ('genre-comedy','Comedy','Comedia'),
    ('genre-drama','Drama','Drama'),
    ('genre-romance','Romance','Romance'),
    ('genre-thriller','Thriller','Thriller'),
    ('genre-horror','Horror','Terror'),
    ('genre-sci-fi','Sci-Fi','Ciencia ficción'),
    ('genre-fantasy','Fantasy','Fantasía'),
    ('genre-documentary','Documentary','Documental'),
    ('genre-crime','Crime','Crimen'),
    ('genre-animation','Animation','Animación'),

    ('story-heist','Heist','Atraco'),
    ('story-revenge','Revenge','Venganza'),
    ('story-mystery','Mystery','Misterio'),
    ('story-crime','Crime','Crimen'),
    ('story-survival','Survival','Supervivencia'),
    ('story-quest','Quest','Búsqueda'),
    ('story-love-story','Love Story','Historia de amor'),
    ('story-coming-of-age','Coming of Age','Llegar a la adultez'),
    ('story-war','War','Guerra'),
    ('story-rivalry','Rivalry','Rivalidad'),
    ('story-redemption','Redemption','Redención'),
    ('story-betrayal','Betrayal','Traición'),
    ('story-investigation','Investigation','Investigación'),
    ('story-escape','Escape','Evasión'),
    ('story-journey','Journey','Viaje'),
    ('story-transformation','Transformation','Transformación'),
    ('story-power-struggle','Power Struggle','Lucha por el poder'),
    ('story-hero','Hero','Héroe'),
    ('story-vampires','Vampires','Vampiros'),
    ('story-zombies','Zombies','Zombis'),

    ('setting-city','City','Ciudad'),
    ('setting-small-town','Small Town','Pueblo pequeño'),
    ('setting-space','Space','Espacio'),
    ('setting-fantasy-world','Fantasy World','Mundo de fantasía'),
    ('setting-post-apocalyptic','Post-Apocalyptic','Postapocalipsis'),
    ('setting-historical','Historical','Histórico'),
    ('setting-modern','Modern','Moderno'),
    ('setting-island','Island','Isla'),
    ('setting-road','Road','Carretera'),
    ('setting-underworld','Underworld','Inframundo'),
    ('setting-world-war-2','World War II','Segunda Guerra Mundial'),
    ('setting-medieval','Medieval','Medieval'),
    ('setting-dystopian','Dystopian','Distópico'),

    ('format-live-action','Live Action','Acción real'),
    ('format-animation','Animation','Animación'),
    ('format-anime','Anime','Anime')
)
INSERT INTO public.interest_translations (interest_id, locale, label, description)
SELECT
  i.id AS interest_id,
  'en' AS locale,
  s.en_label AS label,
  NULL AS description
FROM public.interests i
JOIN seed s ON s.key = i.key
ON CONFLICT (interest_id, locale) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description
;

-- 3) translations: es
WITH seed(key, en_label, es_label) AS (
  VALUES
    ('genre-action','Action','Acción'),
    ('genre-adventure','Adventure','Aventura'),
    ('genre-comedy','Comedy','Comedia'),
    ('genre-drama','Drama','Drama'),
    ('genre-romance','Romance','Romance'),
    ('genre-thriller','Thriller','Thriller'),
    ('genre-horror','Horror','Terror'),
    ('genre-sci-fi','Sci-Fi','Ciencia ficción'),
    ('genre-fantasy','Fantasy','Fantasía'),
    ('genre-documentary','Documentary','Documental'),
    ('genre-crime','Crime','Crimen'),
    ('genre-animation','Animation','Animación'),

    ('story-heist','Heist','Atraco'),
    ('story-revenge','Revenge','Venganza'),
    ('story-mystery','Mystery','Misterio'),
    ('story-crime','Crime','Crimen'),
    ('story-survival','Survival','Supervivencia'),
    ('story-quest','Quest','Búsqueda'),
    ('story-love-story','Love Story','Historia de amor'),
    ('story-coming-of-age','Coming of Age','Llegar a la adultez'),
    ('story-war','War','Guerra'),
    ('story-rivalry','Rivalry','Rivalidad'),
    ('story-redemption','Redemption','Redención'),
    ('story-betrayal','Betrayal','Traición'),
    ('story-investigation','Investigation','Investigación'),
    ('story-escape','Escape','Evasión'),
    ('story-journey','Journey','Viaje'),
    ('story-transformation','Transformation','Transformación'),
    ('story-power-struggle','Power Struggle','Lucha por el poder'),
    ('story-hero','Hero','Héroe'),
    ('story-vampires','Vampires','Vampiros'),
    ('story-zombies','Zombies','Zombis'),

    ('setting-city','City','Ciudad'),
    ('setting-small-town','Small Town','Pueblo pequeño'),
    ('setting-space','Space','Espacio'),
    ('setting-fantasy-world','Fantasy World','Mundo de fantasía'),
    ('setting-post-apocalyptic','Post-Apocalyptic','Postapocalipsis'),
    ('setting-historical','Historical','Histórico'),
    ('setting-modern','Modern','Moderno'),
    ('setting-island','Island','Isla'),
    ('setting-road','Road','Carretera'),
    ('setting-underworld','Underworld','Inframundo'),
    ('setting-world-war-2','World War II','Segunda Guerra Mundial'),
    ('setting-medieval','Medieval','Medieval'),
    ('setting-dystopian','Dystopian','Distópico'),

    ('format-live-action','Live Action','Acción real'),
    ('format-animation','Animation','Animación'),
    ('format-anime','Anime','Anime')
)
INSERT INTO public.interest_translations (interest_id, locale, label, description)
SELECT
  i.id AS interest_id,
  'es' AS locale,
  s.es_label AS label,
  NULL AS description
FROM public.interests i
JOIN seed s ON s.key = i.key
ON CONFLICT (interest_id, locale) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description
;

COMMIT;