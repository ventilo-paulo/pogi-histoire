
DO $mig$
DECLARE
  s text;
  jid int;
BEGIN
  SELECT decrypted_secret INTO s FROM vault.decrypted_secrets WHERE name = 'notion_webhook_secret';
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'notion-sync-15min';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
  PERFORM cron.schedule(
    'notion-sync-15min',
    '*/15 * * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://project--d08419d4-0bc3-46ee-9d81-33f4c5ec14a1-dev.lovable.app/api/public/hooks/notion-sync',
        headers := %L::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
    $cmd$,
    jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', s)::text)
  );
END
$mig$;
