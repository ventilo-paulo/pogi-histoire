
-- Notion sync settings (single row, admin managed)
CREATE TABLE public.notion_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  articles_db_id text,
  videos_db_id text,
  enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  articles_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  videos_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notion_settings TO authenticated;
GRANT ALL ON public.notion_settings TO service_role;
ALTER TABLE public.notion_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notion_settings" ON public.notion_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_notion_settings_updated BEFORE UPDATE ON public.notion_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync log
CREATE TABLE public.notion_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  direction text NOT NULL,           -- 'notion_to_site' | 'site_to_notion' | 'run'
  entity text,                        -- 'article' | 'video' | null (for run summary)
  action text,                        -- 'create' | 'update' | 'skip' | 'error' | 'summary'
  ok boolean NOT NULL DEFAULT true,
  message text,
  ref_id text,                        -- lovable id or notion page id
  details jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notion_sync_log TO authenticated;
GRANT ALL ON public.notion_sync_log TO service_role;
ALTER TABLE public.notion_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sync log" ON public.notion_sync_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_notion_sync_log_run_at ON public.notion_sync_log (run_at DESC);

-- Link columns on existing tables
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS notion_page_id text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS notion_last_edited_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_notion_page_id ON public.articles (notion_page_id) WHERE notion_page_id IS NOT NULL;

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS notion_page_id text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS notion_last_edited_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_notion_page_id ON public.videos (notion_page_id) WHERE notion_page_id IS NOT NULL;

-- Seed the single settings row
INSERT INTO public.notion_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
