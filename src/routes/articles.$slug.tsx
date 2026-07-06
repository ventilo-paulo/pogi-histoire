import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/Skeleton";
import { supabase } from "@/integrations/supabase/client";



export const Route = createFileRoute("/articles/$slug")({
  component: ArticleBySlug,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <div className="max-w-[820px] mx-auto px-6 py-24 text-center">
        <p className="text-pogi-yellow uppercase tracking-widest text-xs mb-3">Erreur</p>
        <h1 className="font-display text-4xl uppercase">Cet article n'a pas pu être chargé</h1>
        <p className="text-gray-600 mt-3 text-sm">{error.message}</p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={reset} className="btn btn-primary">Réessayer</button>
          <Link to="/articles" className="btn btn-ghost">Retour aux articles</Link>
        </div>
      </div>
      <Footer />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <div className="max-w-[820px] mx-auto px-6 py-24 text-center">
        <p className="text-pogi-yellow uppercase tracking-widest text-xs mb-3">404</p>
        <h1 className="font-display text-4xl uppercase">Article introuvable</h1>
        <p className="text-gray-600 mt-3">Il a peut-être été déplacé ou dépublié.</p>
        <Link to="/articles" className="btn btn-primary mt-8">Retour aux articles</Link>
      </div>
      <Footer />
    </div>
  ),
});


type Article = {
  id: string; title: string; slug: string; excerpt: string | null; content: string;
  category: string | null; image_url: string | null; author: string | null;
  published_at: string | null;
};

function ArticleBySlug() {
  const { slug } = Route.useParams();
  const [article, setArticle] = useState<Article | null | undefined>(undefined);

  useEffect(() => {
    supabase.from("articles").select("*").eq("slug", slug).eq("published", true).maybeSingle()
      .then(({ data }) => setArticle((data as Article) ?? null));
  }, [slug]);

  const safeHtml = useMemo(
    () =>
      article
        ? DOMPurify.sanitize(article.content ?? "", {
            ADD_TAGS: ["iframe"],
            ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "src", "target", "rel"],
          })
        : "",
    [article],
  );

  if (article === undefined) {
    return (
      <div className="min-h-screen bg-pogi-light text-pogi-dark">
        <Navbar />
        <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
          <Skeleton className="absolute inset-0 rounded-none" />
        </div>
        <div className="mx-auto max-w-[820px] px-6 py-10 space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
          <div className="pt-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Footer />
      </div>
    );
  }
  if (article === null) throw notFound();

  const dt = article.published_at ? new Date(article.published_at) : null;



  return (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <article>
        <header className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
          {article.image_url && (
            <img src={article.image_url} alt={article.title} className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 mx-auto max-w-[1100px] h-full px-6 flex flex-col items-end justify-end pb-12 text-right">
            {article.category && (
              <span className="text-pogi-yellow uppercase tracking-wider text-sm mb-2">{article.category}</span>
            )}
            <h1 className="font-display text-white text-[44px] md:text-[52px] uppercase leading-none">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-2 italic text-white/90 text-xl md:text-2xl max-w-3xl">{article.excerpt}</p>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-[820px] px-6 py-8 border-b border-black/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {article.author && <p className="italic font-bold text-sm">Par {article.author}</p>}
              {dt && (
                <p className="text-gray-500 text-[13px] mt-1">
                  Publié le {dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className="mx-auto max-w-[820px] px-6 py-10 prose prose-lg max-w-none prose-headings:font-display prose-headings:uppercase prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: safeHtml }}

        />
      </article>
      <Footer />
    </div>
  );
}
