select cron.schedule(
  'site-health-check-hourly',
  '10 * * * *',
  $$
  select net.http_post(
    url:='https://project--d08419d4-0bc3-46ee-9d81-33f4c5ec14a1.lovable.app/api/public/hooks/health-check',
    headers:='{"Content-Type":"application/json","x-webhook-secret":"ba7b4ccfdd231dfd42e1b2428a4b285494006f332bc91ac7"}'::jsonb,
    body:='{}'::jsonb,
    timeout_milliseconds:=180000
  );
  $$
);