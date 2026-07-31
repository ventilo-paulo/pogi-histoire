ALTER TABLE public.site_health_checks
  ADD COLUMN IF NOT EXISTS redirect_chain text,
  ADD COLUMN IF NOT EXISTS response_bytes integer,
  ADD COLUMN IF NOT EXISTS snapshot_url text;

ALTER TABLE public.site_health_settings
  ADD COLUMN IF NOT EXISTS daily_summary_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_daily_summary_at timestamp with time zone;