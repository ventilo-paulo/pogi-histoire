
CREATE TABLE public.seo_index_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null default 'cron',
  ok boolean not null default true,
  sitemap_status text,
  sitemap_errors integer not null default 0,
  sitemap_warnings integer not null default 0,
  urls_total integer not null default 0,
  urls_indexed integer not null default 0,
  urls_pending integer not null default 0,
  urls_missing integer not null default 0,
  urls_error integer not null default 0,
  message text
);
GRANT SELECT ON public.seo_index_runs TO authenticated;
GRANT ALL ON public.seo_index_runs TO service_role;
ALTER TABLE public.seo_index_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo runs" ON public.seo_index_runs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.seo_url_status (
  url text primary key,
  kind text,
  label text,
  verdict text,
  coverage_state text,
  robots_state text,
  last_crawl_time timestamptz,
  error text,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.seo_url_status TO authenticated;
GRANT ALL ON public.seo_url_status TO service_role;
ALTER TABLE public.seo_url_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo url status" ON public.seo_url_status FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.seo_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level text not null default 'warning',
  kind text not null,
  target text,
  title text not null,
  detail text,
  run_id uuid references public.seo_index_runs(id) on delete set null,
  read_at timestamptz
);
CREATE INDEX seo_alerts_created_idx ON public.seo_alerts (created_at DESC);
GRANT SELECT, UPDATE ON public.seo_alerts TO authenticated;
GRANT ALL ON public.seo_alerts TO service_role;
ALTER TABLE public.seo_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo alerts" ON public.seo_alerts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update seo alerts" ON public.seo_alerts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
