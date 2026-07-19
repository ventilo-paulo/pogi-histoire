
UPDATE public.articles
SET content = regexp_replace(
  content,
  '<p[^>]*>\s*<b[^>]*>([^<]+?)</b>\s*(<b[^>]*>\s*</b>)?\s*</p>',
  '<h3>\1</h3>',
  'gi'
)
WHERE slug ILIKE '%core%' OR title ILIKE '%coré%';

UPDATE public.articles
SET content = regexp_replace(content, '(&nbsp;|\s)+</h([234])>', '</h\2>', 'gi');
