import { createFileRoute, Link } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HScroll } from "@/components/HScroll";
import { Reveal } from "@/components/Reveal";
import { ArticleCardSkeleton } from "@/components/Skeleton";
import { absUrl } from "@/lib/site";
import { publishedArticlesStore, type ArticleLite } from "@/lib/realtime-stores";

import heroConcert from "@/assets/hero-concert.jpg";
import aNapoleon from "@/assets/article-napoleon.jpg";
import aWoman from "@/assets/article-woman.jpg";
import aNazca from "@/assets/article-nazca.jpg";
import aAstro from "@/assets/article-astronaut.jpg";
import aCave from "@/assets/article-cave.jpg";
import cAntiquity from "@/assets/coll-antiquity.jpg";
import cAmericas from "@/assets/coll-americas.jpg";
import cWWII from "@/assets/coll-wwii.jpg";
import cIllustres from "@/assets/coll-illustres.jpg";
import cAfrica from "@/assets/coll-africa.jpg";
import pogiLogo from "@/assets/pogi-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "POGI Histoire — Accueil" },
      { name: "description", content: "1991, Monsters of Rock : le jour où l'URSS chuta en musique. Découvrez nos articles et collections." },
      { property: "og:title", content: "POGI Histoire — Accueil" },
      { property: "og:description", content: "1991, Monsters of Rock : le jour où l'URSS chuta en musique. Découvrez nos articles et collections." },
      { property: "og:image", content: absUrl(heroConcert) },
      { name: "twitter:image", content: absUrl(heroConcert) },
    ],
  }),
  component: Home,
});

const fallbackArticles = [
  { img: aNapoleon, alt: "Napoléon" },
  { img: aWoman, alt: "Portrait ancien" },
  { img: aNazca, alt: "Lignes de Nazca" },
  { img: aAstro, alt: "Astronaute" },
  { img: aCave, alt: "Peinture rupestre" },
];

const collections = [
  { img: cAntiquity, label: "L'Antiquité", hash: "antiquite" },
  { img: cAmericas, label: "Les Amériques", hash: "ameriques" },
  { img: cWWII, label: "Seconde Guerre Mondiale", hash: "wwii" },
  { img: cIllustres, label: "Les illustres", hash: "illustres" },
  { img: cAfrica, label: "L'Afrique", hash: "afrique" },
];

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function usePublishedArticles() {
  return useSyncExternalStore(
    publishedArticlesStore.subscribe,
    publishedArticlesStore.getSnapshot,
    publishedArticlesStore.getSnapshot,
  );
}

function FeaturedArticleCard({ a }: { a: ArticleLite }) {
  return (
    <Link
      to="/articles/$slug"
      params={{ slug: a.slug }}
      preload="intent"
      className="group relative shrink-0 w-[200px] h-[280px] rounded-[16px] overflow-hidden card-hover block outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60"
    >
      {a.image_url ? (
        <img src={a.image_url} alt={a.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-pogi-darker" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 text-white">
        {a.category && <span className="text-[10px] uppercase tracking-wider text-pogi-yellow font-bold">{a.category}</span>}
        <h3 className="font-display text-base uppercase leading-tight mt-1 line-clamp-3">{a.title}</h3>
        {a.published_at && <p className="text-white/70 text-[11px] mt-1">{formatDate(a.published_at)}</p>}
      </div>
    </Link>
  );
}


function Home() {
  return (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />

      {/* HERO */}
      <section className="relative h-[calc(100vh-60px)] min-h-[640px] w-full overflow-hidden">
        <img src={heroConcert} alt="Concert" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1280} />
        <div className="absolute inset-0" style={{ background: "rgba(170, 20, 20, 0.55)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)" }}
        />

        <div className="absolute top-6 left-6 flex flex-wrap gap-2 z-10">
          <span className="pill">Dernière sortie</span>
          <span className="pill">Vidéo</span>
          <span className="pill">URSS</span>
        </div>
        <div className="absolute top-6 right-6 z-10">
          <img src={pogiLogo.url} alt="POGI" className="h-12 w-auto object-contain drop-shadow-lg" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] h-full px-6 flex flex-col justify-center">
          <div className="max-w-4xl">
            <h1
              className="hero-title-yellow font-display text-[120px] sm:text-[160px] lg:text-[180px] leading-none"
              style={{ textShadow: "0 4px 18px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.4)" }}
            >
              1991
            </h1>
            <p className="mt-2 font-display text-[40px] sm:text-[52px] text-pogi-red leading-none">
              Monsters of Rock
            </p>
            <p className="mt-4 italic text-xl sm:text-2xl lg:text-[28px] text-white max-w-2xl">
              Le jour où l'URSS chuta… En musique
            </p>

            <div className="mt-10 max-w-2xl">
              <p className="text-[18px] font-bold">
                Dernière sortie : <span className="italic font-normal">Monsters of Rock</span>
              </p>
              <p className="mt-3 text-white/90 leading-relaxed">
                À travers la musique, c'est toute une époque qui se fissure. De la rigidité idéologique de l'URSS aux premiers accords de liberté qui franchissent le Rideau de fer, ce récit retrace la lente décomposition d'un empire vu depuis ses sons, ses interdits et ses résonances…{" "}
                <Link to="/videos" className="text-pogi-yellow font-bold hover:underline">voir plus</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLES À LA UNE */}
      <FeaturedArticlesSection />


      {/* COLLECTIONS */}
      <section className="section-pad pt-0 bg-pogi-dark">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal>
            <h2 className="font-display text-4xl md:text-[36px] uppercase mb-6">Collections</h2>
          </Reveal>
          <Reveal>
            <HScroll>
              {collections.map((c) => (
                <Link
                  to="/collections"
                  hash={c.hash}
                  key={c.label}
                  className="relative shrink-0 w-[180px] h-[180px] rounded-[16px] overflow-hidden card-hover block outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60"
                >
                  <img src={c.img} alt={c.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30" />
                  <span className="absolute inset-0 grid place-items-center text-center text-white font-bold text-base px-3">
                    {c.label}
                  </span>
                </Link>
              ))}
            </HScroll>
          </Reveal>
        </div>
      </section>


      <Footer />
    </div>
  );
}

function FeaturedArticlesSection() {
  const items = usePublishedArticles();
  const loading = items === null;
  const list = items ?? [];

  return (
    <section className="section-pad bg-pogi-dark">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <h2 className="font-display text-4xl md:text-[36px] uppercase mb-6">Articles à la Une</h2>
        </Reveal>
        <Reveal>
          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => <ArticleCardSkeleton key={i} />)}
            </div>
          ) : list.length > 0 ? (
            <HScroll>
              {list.slice(0, 12).map((a) => <FeaturedArticleCard key={a.id} a={a} />)}
            </HScroll>
          ) : (
            <HScroll>
              {fallbackArticles.map((a, i) => (
                <Link
                  to="/articles"
                  key={i}
                  aria-label={`Voir les articles — ${a.alt}`}
                  className="relative shrink-0 w-[200px] h-[280px] rounded-[16px] overflow-hidden card-hover cursor-pointer block outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60"
                >
                  <img src={a.img} alt={a.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <span className="absolute bottom-3 left-3 right-3 text-white font-display uppercase text-sm">{a.alt}</span>
                </Link>
              ))}
            </HScroll>
          )}
        </Reveal>
      </div>
    </section>
  );
}

