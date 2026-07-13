import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HScroll } from "@/components/HScroll";
import { Reveal } from "@/components/Reveal";
import { ArticleCardSkeleton } from "@/components/Skeleton";
import { ArrowRight, Loader2, Mic } from "lucide-react";
import { publishedArticlesStore, type ArticleLite } from "@/lib/realtime-stores";

export const INTERVIEWS_CAT = "Les voix du passé";

export const Route = createFileRoute("/interviews")({
  head: () => ({
    meta: [
      { title: "Interviews — POGI Histoire" },
      { name: "description", content: "Les voix du passé : entretiens et interviews publiés par POGI Histoire." },
      { property: "og:title", content: "Interviews — POGI Histoire" },
      { property: "og:description", content: "Les voix du passé : entretiens et interviews." },
    ],
  }),
  component: InterviewsPage,
});

function usePublishedArticles() {
  return useSyncExternalStore(
    publishedArticlesStore.subscribe,
    publishedArticlesStore.getSnapshot,
    publishedArticlesStore.getSnapshot,
  );
}

function InterviewsPage() {
  const items = usePublishedArticles();
  const loading = items === null;
  const interviews = useMemo(
    () => (items ?? []).filter((a) => a.category === INTERVIEWS_CAT),
    [items],
  );

  return (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />

      <section className="mx-auto max-w-[1400px] px-6 pt-12 pb-6">
        <Reveal>
          <p className="text-pogi-yellow uppercase tracking-widest text-xs font-bold mb-3">Les voix du passé</p>
          <h1 className="font-display text-4xl md:text-[52px] uppercase leading-none">Interviews</h1>
          <p className="text-white/70 mt-4 max-w-2xl">
            Rencontres, entretiens et témoignages : donner la parole à celles et ceux qui font vivre l'histoire.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-20">
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => <ArticleCardSkeleton key={i} />)}
          </div>
        ) : interviews.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <Mic size={40} className="mx-auto text-pogi-yellow mb-4" />
            <p className="font-display text-2xl uppercase">Aucune interview publiée pour le moment</p>
            <p className="text-white/60 mt-2 max-w-md mx-auto">
              Les entretiens de la section « Les voix du passé » apparaîtront ici dès leur publication.
            </p>
          </div>
        ) : (
          <HScroll>
            {interviews.map((a) => <InterviewCard key={a.id} a={a} />)}
          </HScroll>
        )}
      </section>

      <Footer />
    </div>
  );
}

function InterviewCard({ a }: { a: ArticleLite }) {
  const [loading, setLoading] = useState(false);
  return (
    <Link
      to="/articles/$slug"
      params={{ slug: a.slug }}
      preload="intent"
      onClick={() => setLoading(true)}
      className="group relative shrink-0 w-[280px] h-[360px] rounded-[16px] overflow-hidden bg-pogi-darker block outline-none
        transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40
        focus-visible:ring-4 focus-visible:ring-pogi-yellow/60"
    >
      {a.image_url && (
        <img src={a.image_url} alt={a.title} loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 text-pogi-dark px-3 py-1.5 text-xs font-bold uppercase tracking-wider
        opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {loading ? "Ouverture…" : "Lire"}
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <span className="text-xs uppercase tracking-wider text-pogi-yellow">Interview</span>
        <h3 className="font-display text-xl uppercase leading-tight mt-1">{a.title}</h3>
        {a.excerpt && <p className="text-white/80 text-sm mt-1 line-clamp-2">{a.excerpt}</p>}
      </div>
    </Link>
  );
}
