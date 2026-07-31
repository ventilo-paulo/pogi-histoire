import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  ArrowUp,
  Clock,
  Calendar,
  RefreshCw,
  Share2,
  Link as LinkIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/Skeleton";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, absUrl } from "@/lib/site";
import { extractToc, readingTimeMin, stripInlineTypography, type TocItem } from "@/lib/article-utils";

function clip(text: string | null | undefined, max: number, fallback: string) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return fallback;
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("articles")
      .select("title,slug,excerpt,image_url,author,category,published_at,updated_at")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    return { meta: (data as ArticleMeta | null) ?? null };
  },
  head: ({ params, loaderData }) => {
    const a = loaderData?.meta ?? null;
    const url = `${SITE_URL}/articles/${params.slug}`;
    const title = clip(a?.title, 60, "Article — POGI Histoire");
    const description = clip(
      a?.excerpt ?? a?.title,
      158,
      "Un récit d'histoire documenté et sourcé, publié par POGI Histoire.",
    );
    const image = a?.image_url ? absUrl(a.image_url) : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: a
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: a.title,
                description,
                mainEntityOfPage: url,
                url,
                ...(image ? { image: [image] } : {}),
                ...(a.published_at ? { datePublished: a.published_at } : {}),
                ...(a.updated_at ? { dateModified: a.updated_at } : {}),
                author: { "@type": a.author ? "Person" : "Organization", name: a.author || "POGI Histoire" },
                publisher: { "@type": "Organization", name: "POGI Histoire" },
                ...(a.category ? { articleSection: a.category } : {}),
              }),
            },
          ]
        : [],
    };
  },
  component: ArticleBySlug,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <main>
      <div className="max-w-[820px] mx-auto px-6 py-24 text-center">
        <p className="text-pogi-yellow uppercase tracking-widest text-xs mb-3">Erreur</p>
        <h1 className="font-display text-4xl uppercase">Cet article n'a pas pu être chargé</h1>
        <p className="text-gray-600 mt-3 text-sm">{error.message}</p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={reset} className="btn btn-primary">Réessayer</button>
          <Link to="/articles" className="btn btn-ghost">Retour aux articles</Link>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <main>
      <div className="max-w-[820px] mx-auto px-6 py-24 text-center">
        <p className="text-pogi-yellow uppercase tracking-widest text-xs mb-3">404</p>
        <h1 className="font-display text-4xl uppercase">Article introuvable</h1>
        <p className="text-gray-600 mt-3">Il a peut-être été déplacé ou dépublié.</p>
        <Link to="/articles" className="btn btn-primary mt-8">Retour aux articles</Link>
      </div>
      </main>
      <Footer />
    </div>
  ),
});

type ArticleMeta = {
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  author: string | null;
  category: string | null;
  published_at: string | null;
  updated_at: string | null;
};

type Source = { label: string; url?: string };

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  updated_at: string | null;
  tags: string[] | null;
  sources: Source[] | null;
  related_article_ids: string[] | null;
};

type SiblingArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  tags: string[] | null;
};


function ArticleBySlug() {
  const { slug } = Route.useParams();
  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [siblings, setSiblings] = useState<SiblingArticle[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("articles")
      .select("id,title,slug,excerpt,content,category,image_url,author,published_at,updated_at,tags,sources,related_article_ids")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setArticle((data as Article) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    // Fetch a working set of siblings for prev/next + related
    supabase
      .from("articles")
      .select("id,title,slug,excerpt,category,image_url,published_at,tags")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setSiblings((data as SiblingArticle[]) ?? []));
  }, [slug]);

  const { html: patchedHtml, toc } = useMemo(() => {
    if (!article) return { html: "", toc: [] as TocItem[] };
    return extractToc(stripInlineTypography(article.content ?? ""));
  }, [article]);

  const safeHtml = useMemo(
    () =>
      patchedHtml
        ? DOMPurify.sanitize(patchedHtml, {
            FORBID_TAGS: ["font", "style"],
            FORBID_ATTR: ["style", "face", "size", "color", "bgcolor", "align"],
            ADD_TAGS: ["iframe", "figure", "figcaption"],
            ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "src", "target", "rel", "id", "loading", "alt"],
          })
        : "",
    [patchedHtml],
  );

  const readMin = useMemo(() => (article ? readingTimeMin(article.content ?? "") : 0), [article]);

  const { prev, next, related } = useMemo(() => {
    if (!article || siblings.length === 0) return { prev: null, next: null, related: [] as SiblingArticle[] };
    const sorted = [...siblings].sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return tb - ta;
    });
    const idx = sorted.findIndex((s) => s.id === article.id);
    const p = idx > 0 ? sorted[idx - 1] : null; // newer
    const n = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null; // older

    // "À lire ensuite" — priority: admin-picked related_article_ids,
    // fallback: same category, fallback: most recent.
    const others = sorted.filter((s) => s.id !== article.id);
    const picked = new Map<string, SiblingArticle>();
    for (const id of article.related_article_ids ?? []) {
      const hit = others.find((s) => s.id === id);
      if (hit) picked.set(hit.id, hit);
      if (picked.size >= 3) break;
    }
    if (picked.size < 3 && article.category) {
      for (const s of others) {
        if (picked.has(s.id)) continue;
        if (s.category === article.category) picked.set(s.id, s);
        if (picked.size >= 3) break;
      }
    }
    if (picked.size < 3) {
      for (const s of others) {
        if (picked.has(s.id)) continue;
        picked.set(s.id, s);
        if (picked.size >= 3) break;
      }
    }
    return { prev: p, next: n, related: Array.from(picked.values()) };
  }, [article, siblings]);


  if (article === undefined) {
    return (
      <div className="min-h-screen bg-pogi-light text-pogi-dark">
        <Navbar />
      <main>
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
        </div>
        </main>
      <Footer />
      </div>
    );
  }
  if (article === null) throw notFound();

  const publishedDt = article.published_at ? new Date(article.published_at) : null;
  const updatedDt = article.updated_at ? new Date(article.updated_at) : null;
  const updatedIsRecent =
    publishedDt && updatedDt
      ? updatedDt.getTime() - publishedDt.getTime() > 24 * 60 * 60 * 1000
      : false;

  return (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <main>
      <ReadingProgress />
      <article>
        {/* Hero */}
        <header className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
          {article.image_url && (
            <img
              src={article.image_url}
              alt={article.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 mx-auto max-w-[1100px] h-full px-6 flex flex-col items-end justify-end pb-12 text-right">
            {article.category && (
              <span className="text-pogi-yellow uppercase tracking-wider text-sm mb-2">{article.category}</span>
            )}
            <h1 className="font-display text-white uppercase leading-[1.1] text-[40px] md:text-[56px]">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-2 italic text-white/90 text-xl md:text-2xl max-w-3xl">{article.excerpt}</p>
            )}
          </div>
        </header>

        {/* Meta bar */}
        <div className="mx-auto max-w-[1100px] px-6 py-6 border-b border-black/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              {article.author && <p className="italic font-bold text-sm">Par {article.author}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500">
                {publishedDt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} />
                    Publié le{" "}
                    {publishedDt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                {updatedIsRecent && updatedDt && (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw size={14} />
                    Mis à jour le{" "}
                    {updatedDt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  {readMin} min de lecture
                </span>
              </div>
            </div>

            <ShareButtons title={article.title} />
          </div>
        </div>

        {/* Body: TOC + content */}
        <div className="mx-auto max-w-[1100px] px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          <aside className="hidden lg:block">
            {toc.length > 0 && <Toc items={toc} />}
          </aside>
          <div>
            {toc.length > 0 && (
              <details className="lg:hidden mb-6 border border-black/10 rounded-lg bg-white/70">
                <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 font-semibold uppercase tracking-wider text-sm">
                  <List size={16} /> Sommaire
                </summary>
                <div className="px-2 pb-3">
                  <Toc items={toc} showTitle={false} />
                </div>
              </details>
            )}
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />

            {/* Sources */}
            {article.sources && article.sources.length > 0 && (
              <section className="mt-14 pt-8 border-t border-black/10">
                <h2 className="font-display uppercase text-2xl mb-4">Sources</h2>
                <ol className="list-decimal pl-6 space-y-2 text-[15px] text-gray-700">
                  {article.sources.map((s, i) => (
                    <li key={i}>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pogi-blue underline underline-offset-2 hover:text-pogi-red break-words"
                        >
                          {s.label || s.url}
                        </a>
                      ) : (
                        <span>{s.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Share (bottom) */}
            <div className="mt-12 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-gray-600 uppercase tracking-wider font-semibold">
                Cet article vous a plu ? Partagez-le
              </p>
              <ShareButtons title={article.title} />
            </div>

            {/* Tags (clickable → recherche) */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-black/10">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((t) => (
                    <Link
                      key={t}
                      to="/articles"
                      search={{ q: t, cat: "" }}
                      className="inline-flex items-center text-[12px] uppercase tracking-wider bg-black/5 hover:bg-pogi-yellow text-pogi-dark px-3 py-1.5 rounded-full transition-colors"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Prev / Next */}
        {(prev || next) && (
          <nav className="mx-auto max-w-[1100px] px-6 py-8 border-t border-black/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {prev ? (
              <Link
                to="/articles/$slug"
                params={{ slug: prev.slug }}
                className="group block p-5 rounded-xl bg-white border border-black/10 hover:border-pogi-yellow transition-colors"
              >
                <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-gray-500">
                  <ChevronLeft size={14} /> Article précédent
                </span>
                <p className="mt-2 font-display uppercase text-xl leading-tight group-hover:text-pogi-blue transition-colors">
                  {prev.title}
                </p>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to="/articles/$slug"
                params={{ slug: next.slug }}
                className="group block p-5 rounded-xl bg-white border border-black/10 hover:border-pogi-yellow transition-colors md:text-right"
              >
                <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-gray-500 md:justify-end">
                  Article suivant <ChevronRight size={14} />
                </span>
                <p className="mt-2 font-display uppercase text-xl leading-tight group-hover:text-pogi-blue transition-colors">
                  {next.title}
                </p>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="mx-auto max-w-[1100px] px-6 py-10 border-t border-black/10">
            <h2 className="font-display uppercase text-3xl mb-6">À lire ensuite</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

              {related.map((r) => (
                <Link
                  key={r.id}
                  to="/articles/$slug"
                  params={{ slug: r.slug }}
                  className="group block rounded-[16px] overflow-hidden bg-white border border-black/10 card-hover"
                >
                  <div className="relative aspect-[16/10] bg-black/5 overflow-hidden">
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt={r.title}
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    {r.category && (
                      <span className="text-pogi-yellow uppercase tracking-wider text-[11px]">{r.category}</span>
                    )}
                    <h3 className="font-display uppercase text-lg leading-tight mt-1 group-hover:text-pogi-blue transition-colors">
                      {r.title}
                    </h3>
                    {r.excerpt && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{r.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      <BackToTop />
      </main>
      <Footer />
    </div>
  );
}

/* -------------------- Reading progress -------------------- */

function ReadingProgress() {
  const [w, setW] = useState(0);
  useEffect(() => {
    function update() {
      const h = document.documentElement;
      const scrollTop = h.scrollTop || document.body.scrollTop;
      const height = h.scrollHeight - h.clientHeight;
      const pct = height > 0 ? (scrollTop / height) * 100 : 0;
      setW(Math.min(100, Math.max(0, pct)));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div className="reading-progress" aria-hidden>
      <span style={{ width: `${w}%` }} />
    </div>
  );
}

/* -------------------- Back to top -------------------- */

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      aria-label="Retour en haut"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-pogi-yellow text-pogi-dark shadow-lg grid place-items-center transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      } hover:scale-110`}
    >
      <ArrowUp size={20} />
    </button>
  );
}

/* -------------------- Share buttons -------------------- */

function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copyLink();
  }

  const enc = encodeURIComponent;
  const items = [
    {
      label: "Partager sur X",
      href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M18.244 2H21l-6.53 7.463L22 22h-6.828l-4.77-6.03L4.8 22H2l7.02-8.02L2 2h6.914l4.29 5.5L18.244 2Zm-2.393 18h1.79L8.24 4H6.34L15.85 20Z" />
        </svg>
      ),
    },
    {
      label: "Partager sur Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6H17V4.3c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2.1H7v3.2h3v8h3.5Z" />
        </svg>
      ),
    },
    {
      label: "Partager sur LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9.5h4V21H3V9.5Zm7 0h3.8v1.6h.1c.5-1 1.9-2 3.9-2 4.2 0 5 2.7 5 6.3V21H18v-5c0-1.2 0-2.8-1.7-2.8-1.8 0-2 1.4-2 2.7V21h-4V9.5Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={it.label}
          className="h-9 w-9 grid place-items-center rounded-full bg-black/5 text-pogi-dark hover:bg-pogi-yellow transition-colors"
        >
          {it.icon}
        </a>
      ))}
      <button
        onClick={copyLink}
        aria-label="Copier le lien"
        className="h-9 w-9 grid place-items-center rounded-full bg-black/5 text-pogi-dark hover:bg-pogi-yellow transition-colors"
      >
        {copied ? <Check size={16} /> : <LinkIcon size={16} />}
      </button>
      <button
        onClick={nativeShare}
        aria-label="Partager"
        className="h-9 w-9 grid place-items-center rounded-full bg-black/5 text-pogi-dark hover:bg-pogi-yellow transition-colors sm:hidden"
      >
        <Share2 size={16} />
      </button>
    </div>
  );
}

/* -------------------- Table of contents -------------------- */

function Toc({ items, showTitle = true }: { items: TocItem[]; showTitle?: boolean }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    function update() {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const offsets = items
          .map((i) => {
            const el = document.getElementById(i.id);
            if (!el) return null;
            return { id: i.id, top: el.getBoundingClientRect().top };
          })
          .filter(Boolean) as { id: string; top: number }[];
        const passed = offsets.filter((o) => o.top <= 120);
        const current = passed.length ? passed[passed.length - 1] : offsets[0];
        if (current) setActive(current.id);
      });
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [items]);

  return (
    <nav className="lg:sticky lg:top-[88px]">
      {showTitle && (
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 px-2">Sommaire</p>
      )}
      <div className="border-l border-black/10">
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(it.id);
              if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top, behavior: "smooth" });
                history.replaceState(null, "", `#${it.id}`);
              }
            }}
            className={`toc-link ${active === it.id ? "is-active" : ""}`}
          >
            {it.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
