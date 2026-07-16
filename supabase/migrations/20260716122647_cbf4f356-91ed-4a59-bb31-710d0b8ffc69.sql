
-- 1) Videos: add slug for dedicated per-video pages
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS videos_slug_key ON public.videos(slug) WHERE slug IS NOT NULL;

-- 2) Videos: add description (long text) for detail page content
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS description text;

-- 3) Media library: per-file credit / source (path is the storage object key inside the "media" bucket)
CREATE TABLE IF NOT EXISTS public.media_credits (
  path text PRIMARY KEY,
  filename text,
  credit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.media_credits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_credits TO authenticated;
GRANT ALL ON public.media_credits TO service_role;

ALTER TABLE public.media_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads media credits"
  ON public.media_credits FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage media credits"
  ON public.media_credits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER media_credits_updated_at
  BEFORE UPDATE ON public.media_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
