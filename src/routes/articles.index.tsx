import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InternalLinks } from "@/components/InternalLinks";
import { HScroll } from "@/components/HScroll";
import { Reveal } from "@/components/Reveal";
import { ArticleCardSkeleton, ArticleCardSkeletonGrid } from "@/components/Skeleton";
import { ArrowRight, Loader2, Search, SearchX, X } from "lucide-react";
import { absUrl } from "@/lib/site";
import { categoriesStore, publishedArticlesStore, type ArticleLite } from "@/lib/realtime-stores";

import heroRenaissance from "@/assets/hero-renaissance.webp";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/articles/")({
  head: () => ({
    meta: [
      { title: "Articles — POGI Histoire" },
      { name: "description", content: "Le Roi et le Génie : les piliers de la Renaissance. Articles d'histoire approfondis." },
      { property: "og:title", content: "Articles — POGI Histoire" },
      { property: "og:description", content: "Articles d'histoire, récits et accompagnements de visite." },
      { property: "og:image", content: absUrl(heroRenaissance) },
      { name: "twitter:image", content: absUrl(heroRenaissance) },
      { property: "og:url", content: "https://pogi-histoire.com/articles" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pogi-histoire.com/articles" }],
  }),
  validateSearch: (s: Record<string, unknown>) => {
    const out: { cat?: string; q?: string } = {};
    if (typeof s.cat === "string" && s.cat) out.cat = s.cat;
    if (typeof s.q === "string" && s.q) out.q = s.q;
    return out;
  },
  component: ArticlesPage,
});

function ArticlesPage() {
  const { cat = "", q = "" } = Route.useSearch();
  const filtering = !!(cat || q.trim());



  return (
    <div className="min-h-screen bg-pogi-light">
      <Navbar />
      <main>

      {/* HERO — dernier article publié */}
      <LatestArticleHero />



      {/* FILTRE + RECHERCHE */}
      <ArticlesFilterBar />

      {filtering ? (
        <FilteredArticles cat={cat} q={q} />
      ) : (
        <>
          <PublishedArticlesRow />
          <ArticlesByCategory />
        </>
      )}





      <InternalLinks variant="light" showArticles={false} videosTitle="Vidéos recommandées" />
      </main>
      <Footer />
    </div>
  );
}

/* -------- Hero (latest published) -------- */

function LatestArticleHero() {
  const items = usePublishedArticles();
  const latest = items?.[0];

  if (!latest) {
    return (
      <section className="relative h-[50vh] min-h-[360px] md:h-[70vh] md:min-h-[520px] w-full overflow-hidden bg-pogi-dark">
        <img src={heroRenaissance} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 mx-auto max-w-[1400px] h-full px-6 flex flex-col justify-end pb-10 md:pb-16">
          <h1 className="font-display text-white text-[40px] md:text-[64px] uppercase leading-none">Articles</h1>
          <p className="mt-3 text-white/90 text-base md:text-lg max-w-2xl">Récits, enquêtes et grands portraits d'histoire.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-pogi-dark">
      <Link
        to="/articles/$slug"
        params={{ slug: latest.slug }}
        preload="intent"
        onClick={() => track("article_click", { label: latest.title, slug: latest.slug, meta: { placement: "articles_hero" } })}
        aria-label={`Lire l'article : ${latest.title}`}
        className="group relative block h-[60vh] min-h-[440px] md:h-[70vh] md:min-h-[560px] w-full outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60"
      >
        {latest.image_url ? (
          <img
            src={latest.image_url}
            alt={latest.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <img src={heroRenaissance} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        <div className="relative z-10 mx-auto max-w-[1400px] h-full px-6 flex flex-col justify-end pb-10 md:pb-16">
          <div className="max-w-3xl">
            {latest.category && (
              <span className="inline-block pill bg-pogi-yellow text-pogi-dark font-bold">{latest.category}</span>
            )}
            <h1
              className="mt-3 md:mt-4 font-display uppercase text-white text-[36px] sm:text-[52px] lg:text-[72px] leading-[0.95]"
              style={{ textShadow: "0 4px 18px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.5)" }}
            >
              {latest.title}
            </h1>
            {latest.excerpt && (
              <p className="mt-4 md:mt-6 text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl line-clamp-3">
                {latest.excerpt}
              </p>
            )}
            <span className="mt-4 md:mt-6 inline-flex items-center gap-2 text-pogi-yellow font-bold group-hover:underline">
              Lire l'article <ArrowRight size={18} />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

/* -------- Card -------- */

function ArticleCard({
  a,
  fluid = false,
  placement = "articles_list",
  searchTerm,
  searchCat,
  position,
  resultsCount,
}: {
  a: ArticleLite;
  fluid?: boolean;
  placement?: string;
  searchTerm?: string;
  searchCat?: string;
  position?: number;
  resultsCount?: number;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Link
      to="/articles/$slug"
      params={{ slug: a.slug }}
      preload="intent"
      onClick={() => {
        track("article_click", { label: a.title, slug: a.slug, meta: { placement } });
        if (placement === "search_results") {
          track("search_result_click", {
            label: a.title,
            slug: a.slug,
            meta: {
              kind: "article",
              source: "results_page",
              term: searchTerm ?? "",
              category: searchCat ?? "",
              position,
              results: resultsCount,
            },
          });
        }
        setLoading(true);
      }}
      aria-busy={loading}
      className={`group relative ${fluid ? "w-full" : "shrink-0 w-[260px] sm:w-[280px]"} h-[340px] sm:h-[360px] rounded-[16px] overflow-hidden bg-pogi-dark block outline-none
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40
        focus-visible:ring-4 focus-visible:ring-pogi-yellow/60`}
    >
      {a.image_url && (
        <img
          src={a.image_url}
          alt={a.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20" />

      {/* Lire indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 text-pogi-dark px-3 py-1.5 text-xs font-bold uppercase tracking-wider
        opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {loading ? "Ouverture…" : "Lire"}
      </div>

      <div className="absolute bottom-4 left-4 right-4 text-white">
        {a.category && <span className="text-xs uppercase tracking-wider text-pogi-yellow">{a.category}</span>}
        <h3 className="font-display text-xl uppercase leading-tight mt-1">{a.title}</h3>
        {a.excerpt && <p className="text-white/80 text-sm mt-1 line-clamp-2">{a.excerpt}</p>}
      </div>

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <Loader2 className="animate-spin text-pogi-yellow" size={32} />
        </div>
      )}
    </Link>
  );
}

/* -------- Filter bar -------- */

function useCategories() {
  return useSyncExternalStore(
    categoriesStore.subscribe,
    categoriesStore.getSnapshot,
    categoriesStore.getSnapshot,
  );
}

function ArticlesFilterBar() {
  const { cat = "", q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/articles/" });
  const cats = useCategories();
  const items = usePublishedArticles();
  const [text, setText] = useState(q);

  useEffect(() => { setText(q); }, [q]);

  const nonEmpty = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((a) => { if (a.category) set.add(a.category); });
    return set;
  }, [items]);

  const visibleCats = useMemo(
    () => cats.filter((c) => nonEmpty.has(c.name) || c.name === cat),
    [cats, nonEmpty, cat],
  );

  function setCat(next: string) {
    navigate({ search: (prev: any) => ({ ...(prev as any), cat: next }) as any });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: (prev: any) => ({ ...(prev as any), q: text.trim() }) as any });
  }
  function clearAll() {
    setText("");
    navigate({ search: (() => ({})) as any });
  }

  const active = !!(cat || q);

  return (
    <section className="bg-pogi-light border-b border-black/5">
      <div className="mx-auto max-w-[1400px] px-6 py-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCat("")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider transition
              ${!cat ? "bg-pogi-dark text-white" : "bg-white text-pogi-dark border border-black/10 hover:border-pogi-dark"}`}
          >
            Toutes
          </button>
          {visibleCats.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.name)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider transition
                ${cat === c.name ? "bg-pogi-dark text-white" : "bg-white text-pogi-dark border border-black/10 hover:border-pogi-dark"}`}
            >
              {c.name}
            </button>
          ))}
        </div>


        <form onSubmit={submit} className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Rechercher un article…"
              className="w-full pl-9 pr-9 py-2 rounded-full bg-white border border-black/10 text-sm text-pogi-dark
                focus:outline-none focus:ring-2 focus:ring-pogi-yellow"
            />
            {text && (
              <button type="button" onClick={() => setText("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-pogi-dark">
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary">
            Rechercher
          </button>
          {active && (
            <button type="button" onClick={clearAll}
              className="text-sm text-gray-600 hover:text-pogi-dark underline">
              Réinitialiser
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

/* -------- Filtered grid -------- */

function usePublishedArticles() {
  return useSyncExternalStore(
    publishedArticlesStore.subscribe,
    publishedArticlesStore.getSnapshot,
    publishedArticlesStore.getSnapshot,
  );
}

function FilteredArticles({ cat, q }: { cat: string; q: string }) {
  const items = usePublishedArticles();
  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    return items.filter((a) => {
      if (cat && (a.category ?? "") !== cat) return false;
      if (needle) {
        const hay = `${a.title} ${a.excerpt ?? ""} ${a.category ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, cat, q]);

  return (
    <section className="section-pad">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <h2 className="font-display text-[32px] text-pogi-dark uppercase mb-5">
            {cat ? cat : "Résultats"}
            {q && <span className="text-gray-500 text-lg normal-case font-sans ml-2">— "{q}"</span>}
          </h2>
        </Reveal>

        {filtered === null && <ArticleCardSkeletonGrid count={8} />}
        {filtered && filtered.length === 0 && (
          <div className="empty-state max-w-xl mx-auto">
            <SearchX className="mx-auto mb-3 text-gray-400" size={28} />
            <p className="font-display text-2xl text-pogi-dark uppercase">Aucun résultat</p>
            <p className="mt-1 text-sm text-gray-500">
              Essayez un autre mot-clé ou une autre catégorie.
            </p>
          </div>
        )}
        {filtered && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((a, i) => (
              <Reveal key={a.id} delay={Math.min(i * 40, 240)} className="w-full">
                <ArticleCard a={a} fluid />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


/* -------- Default rows -------- */

function PublishedArticlesRow() {
  const items = usePublishedArticles();
  const loading = items === null;
  if (!loading && items!.length === 0) return null;
  const top = (items ?? []).slice(0, 12);
  return (
    <section className="section-pad bg-pogi-light">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <h2 className="font-display text-[32px] text-pogi-dark uppercase mb-5">Derniers publiés</h2>
        </Reveal>
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => <ArticleCardSkeleton key={i} />)}
          </div>
        ) : (
          <HScroll dark={false}>
            {top.map((a) => <ArticleCard key={a.id} a={a} />)}
          </HScroll>
        )}
      </div>
    </section>
  );
}


function ArticlesByCategory() {
  const cats = useCategories();
  const items = usePublishedArticles();

  const byCat = useMemo(() => {
    const g: Record<string, ArticleLite[]> = {};
    (items ?? []).forEach((a) => {
      const k = a.category || "Autres";
      (g[k] ??= []).push(a);
    });
    return g;
  }, [items]);

  const orderedNames = [
    ...cats.map((c) => c.name).filter((n) => (byCat[n] ?? []).length > 0),
    ...Object.keys(byCat).filter((n) => !cats.some((c) => c.name === n)),
  ];
  if (orderedNames.length === 0) return null;

  return (
    <>
      {orderedNames.map((name) => (
        <section key={name} className="section-pad">
          <div className="mx-auto max-w-[1400px] px-6">
            <Reveal>
              <h2 className="font-display text-[32px] text-pogi-dark uppercase mb-5">{name}</h2>
            </Reveal>
            <HScroll dark={false}>
              {byCat[name].map((a) => <ArticleCard key={a.id} a={a} />)}
            </HScroll>
          </div>
        </section>
      ))}
    </>
  );
}
