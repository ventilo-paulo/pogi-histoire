
INSERT INTO public.articles (slug, title, excerpt, content, category, author, image_url, published, published_at)
VALUES (
  'le-roi-et-le-genie',
  'Le Roi et le Génie',
  'Les piliers de la Renaissance : François Ier et Léonard de Vinci, récit d''une rencontre fondatrice.',
  '<p>À Amboise, en mai 1519, un vieil homme s''éteint dans les bras d''un roi. Léonard de Vinci, le génie florentin, meurt aux côtés de François I<sup>er</sup>, son protecteur. Cette scène — réelle ou mythifiée par Ingres trois siècles plus tard — résume l''esprit d''une époque où le pouvoir et la création s''entendent comme rarement dans l''histoire.</p><h2>Une rencontre fondatrice</h2><p>Lorsque François I<sup>er</sup> revient d''Italie après Marignan, il rapporte plus qu''une victoire militaire : il rapporte une vision. Celle d''une cour brillante, peuplée d''artistes, d''architectes et de savants. Léonard, alors âgé de soixante-quatre ans, accepte l''invitation royale et s''installe au Clos Lucé avec ses carnets, ses inventions et la Joconde.</p><h2>Les piliers d''un renouveau</h2><p>La Renaissance française s''enracine alors dans trois piliers que ce couple improbable incarne :</p><ul><li>L''humanisme — l''homme retrouve sa place au centre du monde.</li><li>L''art — la beauté devient un langage politique et spirituel.</li><li>La science — observer, mesurer, inventer pour comprendre.</li></ul><h2>Un héritage durable</h2><p>De Chambord à Fontainebleau, l''empreinte de cette alliance se lit dans la pierre. Mais au-delà des châteaux, c''est une certaine idée de la France qui s''installe — celle d''un pays où le roi protège les arts, et où l''artiste éclaire le roi.</p><p><em>Pour aller plus loin, retrouvez nos vidéos consacrées à la Renaissance dans la collection "Les illustres".</em></p>',
  'Renaissance',
  'Guillaume GUEST',
  'https://pogi-histoire.lovable.app/assets/hero-renaissance.jpg',
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  author = EXCLUDED.author,
  published = true,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at);
