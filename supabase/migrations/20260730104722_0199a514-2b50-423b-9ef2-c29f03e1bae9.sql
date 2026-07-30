UPDATE public.articles
SET content = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(content, '</?font[^>]*>', '', 'gi'),
      '</?span[^>]*>', '', 'gi'),
    '\s(style|face|size|color|bgcolor|align)\s*=\s*("[^"]*"|''[^'']*'')', '', 'gi'),
  '\s(style|face|size|color|bgcolor|align)\s*=\s*("[^"]*"|''[^'']*'')', '', 'gi')
WHERE content ~* '<font|style=|face=|<span';