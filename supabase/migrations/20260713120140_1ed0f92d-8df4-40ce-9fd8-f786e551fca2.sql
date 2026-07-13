
-- Seed a Vault-backed secret for the Notion webhook, and re-schedule the
-- pg_cron job to send it in the x-webhook-secret header so the sync
-- endpoint accepts the call.
DO $mig$
DECLARE
  s text;
  existing uuid;
  jid int;
BEGIN
  SELECT id INTO existing FROM vault.secrets WHERE name = 'notion_webhook_secret';
  IF existing IS NULL THEN
    s := encode(gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(s, 'notion_webhook_secret', 'Shared secret for the Notion sync webhook (used by pg_cron)');
  ELSE
    SELECT decrypted_secret INTO s FROM vault.decrypted_secrets WHERE name = 'notion_webhook_secret';
  END IF;

  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'notion-sync-15min';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;

  PERFORM cron.schedule(
    'notion-sync-15min',
    '*/15 * * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://project--d08419d4-0bc3-46ee-9d81-33f4c5ec14a1.lovable.app/api/public/hooks/notion-sync',
        headers := %L::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
    $cmd$,
    jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', s)::text)
  );
END
$mig$;
