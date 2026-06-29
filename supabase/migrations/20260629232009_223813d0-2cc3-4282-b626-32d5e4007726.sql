
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS list_text text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS indexable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS related_article_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
