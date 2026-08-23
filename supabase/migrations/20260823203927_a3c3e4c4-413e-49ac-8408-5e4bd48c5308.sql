CREATE TABLE public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  path text,
  label text,
  slug text,
  meta jsonb not null default '{}'::jsonb,
  session_id text,
  referrer text,
  created_at timestamptz not null default now()
);
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX analytics_events_event_idx ON public.analytics_events (event);

GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT, SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can record an event"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(event) <= 64 AND char_length(coalesce(path,'')) <= 512 AND char_length(coalesce(label,'')) <= 256);

CREATE POLICY "admins can read events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));