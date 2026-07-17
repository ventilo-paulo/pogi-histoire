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


const HERO_SLUG = "versailles-ou-la-mise-en-scene-du-pouvoir-absolu";
const HERO_FALLBACK_SUBTITLE =
  "Comment Louis XIV a transformé un pavillon de chasse en théâtre du pouvoir absolu — architecture, étiquette et propagande au service du Roi-Soleil.";

function Hero() {
  const items = usePublishedArticles();
  const heroArticle = items?.find((a) => a.slug === HERO_SLUG);
  const subtitle = heroArticle?.excerpt?.trim() || HERO_FALLBACK_SUBTITLE;

  return (
    <section className="relative w-full overflow-hidden">
      <Link
        to="/articles/$slug"
        params={{ slug: HERO_SLUG }}
        preload="intent"
        aria-label="Lire l'article : Versailles ou la mise en scène du pouvoir absolu"
        className="group relative block h-[calc(100vh-60px)] min-h-[640px] w-full outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60"
      >
        <img
          src="https://wjexjgjyfglvrpktbpvz.supabase.co/storage/v1/object/sign/media/articles/f872825c-8b53-4376-bd2b-71af751cfbf3.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lOWU2ZGQxYS00ODJjLTQ3NTQtOTdkNi1iMGU5YTQ3MWJlMGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9hcnRpY2xlcy9mODcyODI1Yy04YjUzLTQzNzYtYmQyYi03MWFmNzUxY2ZiZjMuanBnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4MjgzMzM3MCwiZXhwIjoyMDk4MTkzMzcwfQ.NTJt1qXL4b4RPPsMOojSSocQpxy9auuSXHq0n0GGGqM"
          alt="Versailles ou la mise en scène du pouvoir absolu"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        <div className="absolute top-6 right-6 z-10">
          <img src={pogiLogo.url} alt="POGI" className="h-12 w-auto object-contain drop-shadow-lg" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] h-full px-6 flex flex-col justify-end pb-20">
          <div className="max-w-3xl">
            <span className="inline-block pill bg-pogi-yellow text-pogi-dark font-bold">
              XVIIe siècle
            </span>
            <h1
              className="mt-4 font-display uppercase text-white text-[44px] sm:text-[64px] lg:text-[80px] leading-[0.95]"
              style={{ textShadow: "0 4px 18px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.5)" }}
            >
              Versailles ou la mise en scène du pouvoir absolu
            </h1>
            <p className="mt-6 text-white/90 text-lg sm:text-xl leading-relaxed max-w-2xl">
              {subtitle}
            </p>
            <span className="mt-6 inline-block text-pogi-yellow font-bold group-hover:underline">
              Lire l'article →
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />

      {/* HERO — Article à la une */}
      <Hero />




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

