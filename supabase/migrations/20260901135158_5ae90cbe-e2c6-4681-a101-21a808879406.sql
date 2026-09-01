CREATE TABLE IF NOT EXISTS public.seo_query_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  query text NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr double precision NOT NULL DEFAULT 0,
  position double precision NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, query)
);

CREATE INDEX IF NOT EXISTS seo_query_ranks_query_idx ON public.seo_query_ranks (query, date DESC);
CREATE INDEX IF NOT EXISTS seo_query_ranks_date_idx ON public.seo_query_ranks (date DESC);

GRANT SELECT ON public.seo_query_ranks TO authenticated;
GRANT ALL ON public.seo_query_ranks TO service_role;

ALTER TABLE public.seo_query_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read search position history"
ON public.seo_query_ranks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));