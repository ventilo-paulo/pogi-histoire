SELECT cron.unschedule('search-alerts-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'search-alerts-daily');

SELECT cron.schedule(
  'search-alerts-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--d08419d4-0bc3-46ee-9d81-33f4c5ec14a1.lovable.app/api/public/hooks/search-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'seo_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);