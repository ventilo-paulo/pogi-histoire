UPDATE public.articles
SET content = regexp_replace(
  content,
  '<div>\s*<b>([^<]+)</b>\s*</div>',
  '<h2>\1</h2>',
  'g'
)
WHERE id = 'd5c83457-6f63-4975-b16c-b484633b1812';