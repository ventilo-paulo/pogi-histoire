CREATE TABLE public.site_health_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL DEFAULT 'cron',
  ok boolean NOT NULL DEFAULT true,
  checks_total integer NOT NULL DEFAULT 0,
  checks_ok integer NOT NULL DEFAULT 0,
  checks_failed integer NOT NULL DEFAULT 0,
  duration_ms integer,
  message text
);

CREATE TABLE public.site_health_checks (
  target text PRIMARY KEY,
  kind text NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'ok',
  http_status integer,
  response_ms integer,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  last_ok_at timestamptz,
  failing_since timestamptz
);

CREATE TABLE public.site_health_settings (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  notify_email text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_health_settings_single CHECK (id)
);

INSERT INTO public.site_health_settings (id, notify_email) VALUES (true, 'pogi.videos@gmail.com');

GRANT SELECT ON public.site_health_runs TO authenticated;
GRANT SELECT ON public.site_health_checks TO authenticated;
GRANT SELECT, UPDATE ON public.site_health_settings TO authenticated;
GRANT ALL ON public.site_health_runs TO service_role;
GRANT ALL ON public.site_health_checks TO service_role;
GRANT ALL ON public.site_health_settings TO service_role;

ALTER TABLE public.site_health_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_health_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read health runs" ON public.site_health_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read health checks" ON public.site_health_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read health settings" ON public.site_health_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update health settings" ON public.site_health_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));