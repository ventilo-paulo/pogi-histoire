import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InternalLinks } from "@/components/InternalLinks";
import { Reveal } from "@/components/Reveal";
import { absUrl } from "@/lib/site";
import { COLLECTIONS } from "@/lib/collections";


import cWWII from "@/assets/coll-wwii.jpg";
import cAntiquity from "@/assets/coll-antiquity.jpg";
import cAmericas from "@/assets/coll-americas.jpg";
import cAfrica from "@/assets/coll-africa.jpg";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — POGI Histoire" },
      {
        name: "description",
        content:
          "Explorez les collections POGI : Seconde Guerre Mondiale, Antiquité, Moyen-Âge, Les Amériques, Les illustres et L'Afrique.",
      },
      { property: "og:title", content: "Collections — POGI Histoire" },
      { property: "og:description", content: "Toutes les collections d'histoire de POGI." },
      { property: "og:image", content: absUrl(cWWII) },
      { name: "twitter:image", content: absUrl(cWWII) },
      { property: "og:url", content: "https://pogi-histoire.com/collections" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pogi-histoire.com/collections" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Collections — POGI Histoire",
          description:
            "Les collections thématiques de POGI Histoire : Seconde Guerre Mondiale, Antiquité, Moyen-Âge, Les Amériques, Les illustres et L'Afrique.",
          url: "https://pogi-histoire.com/collections",
          isPartOf: { "@id": "https://pogi-histoire.com/#website" },
        }),
      },
    ],
  }),
  component: CollectionsPage,
});

type Collection = {
  id: string;
  title: string;
  subtitle: string;
  img?: string;
  objectPosition?: string;
  available?: boolean;
};

// Titles/subtitles come from the shared index (also used by the search dialog).
const EXTRAS: Record<string, { img?: string; objectPosition?: string }> = {
  wwii: { img: cWWII },
  antiquite: { img: cAntiquity },
  ameriques: { img: cAmericas, objectPosition: "30% center" },
  illustres: { img: "/assets/coll-illustres.jpg", objectPosition: "center 22%" },
  afrique: { img: cAfrica },
};

const collections: Collection[] = COLLECTIONS.map((c) => ({ ...c, ...(EXTRAS[c.id] ?? {}) }));


function CollectionTile({ c }: { c: Collection }) {
  return (
    <article
      id={c.id}
      className="group relative aspect-square rounded-[16px] overflow-hidden bg-pogi-darker scroll-mt-24 outline-none focus-within:ring-4 focus-within:ring-pogi-yellow/60"
    >
      {c.img ? (
        <img
          src={c.img}
          alt={c.title}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          style={{ objectPosition: c.objectPosition ?? "center" }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-pogi-darker via-pogi-dark to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

      {!c.available && (
        <span className="absolute top-3 right-3 z-10 pill bg-pogi-yellow/95 text-pogi-dark text-[11px] font-bold uppercase tracking-wider">
          Bientôt
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h2 className="font-display uppercase text-lg md:text-xl leading-tight">{c.title}</h2>
        <p className="text-white/75 text-sm mt-1 italic line-clamp-2">{c.subtitle}</p>
      </div>
    </article>
  );
}

function CollectionsPage() {
  return (
    <div className="min-h-screen bg-pogi-light">
      <Navbar />
      <main>
      <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-20">
        <Reveal>
          <h1 className="font-display text-[32px] md:text-[40px] text-pogi-dark uppercase mb-3">
            Collections
          </h1>
          <p className="text-pogi-dark/70 max-w-2xl mb-8">
            Nos univers historiques. Certaines collections sont en préparation — repassez bientôt.
          </p>
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-5">
            {collections.map((c) =>
              c.available ? (
                <Link
                  key={c.id}
                  to="/collections"
                  hash={c.id}
                  className="block card-hover outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60 rounded-[16px]"
                >
                  <CollectionTile c={c} />
                </Link>
              ) : (
                <div key={c.id} className="card-hover">
                  <CollectionTile c={c} />
                </div>
              ),
            )}
          </div>
        </Reveal>
      </div>
      <InternalLinks variant="light" showArticles={false} videosTitle="Vidéos recommandées" />
      </main>
      <Footer />
    </div>
  );
}
