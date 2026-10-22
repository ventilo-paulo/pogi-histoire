-- Topics entered by the editorial team (ideas, in progress, already covered elsewhere)
CREATE TABLE public.editorial_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'idee' CHECK (status IN ('idee', 'en_cours', 'traite')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_topics TO authenticated;
GRANT ALL ON public.editorial_topics TO service_role;
ALTER TABLE public.editorial_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage editorial topics" ON public.editorial_topics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER editorial_topics_updated_at BEFORE UPDATE ON public.editorial_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- History of AI angle proposals
CREATE TABLE public.editorial_angle_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus text,
  angles jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX editorial_angle_runs_created_idx ON public.editorial_angle_runs (created_at DESC);
GRANT SELECT, DELETE ON public.editorial_angle_runs TO authenticated;
GRANT ALL ON public.editorial_angle_runs TO service_role;
ALTER TABLE public.editorial_angle_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read angle proposals" ON public.editorial_angle_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete angle proposals" ON public.editorial_angle_runs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Google Search daily totals for the site
CREATE TABLE public.seo_search_daily (
  date date PRIMARY KEY,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr double precision NOT NULL DEFAULT 0,
  position double precision NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_search_daily TO authenticated;
GRANT ALL ON public.seo_search_daily TO service_role;
ALTER TABLE public.seo_search_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read search daily totals" ON public.seo_search_daily
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Google Search stats per page and day
CREATE TABLE public.seo_search_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  page text NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr double precision NOT NULL DEFAULT 0,
  position double precision NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, page)
);
CREATE INDEX seo_search_pages_date_idx ON public.seo_search_pages (date DESC);
GRANT SELECT ON public.seo_search_pages TO authenticated;
GRANT ALL ON public.seo_search_pages TO service_role;
ALTER TABLE public.seo_search_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read search page stats" ON public.seo_search_pages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));