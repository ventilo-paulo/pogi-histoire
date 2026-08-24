CREATE TABLE IF NOT EXISTS public.search_alert_settings (
  id boolean NOT NULL DEFAULT true PRIMARY KEY CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  window_days integer NOT NULL DEFAULT 7,
  min_searches integer NOT NULL DEFAULT 20,
  no_results_threshold_pct integer NOT NULL DEFAULT 25,
  empty_threshold_pct integer NOT NULL DEFAULT 50,
  email_enabled boolean NOT NULL DEFAULT true,
  notify_email text,
  last_alert_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.search_alert_settings TO authenticated;
GRANT ALL ON public.search_alert_settings TO service_role;

ALTER TABLE public.search_alert_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read search alert settings" ON public.search_alert_settings;
CREATE POLICY "Admins read search alert settings" ON public.search_alert_settings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update search alert settings" ON public.search_alert_settings;
CREATE POLICY "Admins update search alert settings" ON public.search_alert_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_search_alert_settings_updated ON public.search_alert_settings;
CREATE TRIGGER trg_search_alert_settings_updated BEFORE UPDATE ON public.search_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.search_alert_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

UPDATE public.search_alert_settings s
SET notify_email = COALESCE(s.notify_email, (SELECT notify_email FROM public.site_health_settings LIMIT 1));