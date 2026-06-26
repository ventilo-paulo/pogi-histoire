import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HScroll } from "@/components/HScroll";

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
import books from "@/assets/newsletter-books.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "POGI Histoire — Accueil" },
      { name: "description", content: "1991, Monsters of Rock : le jour où l'URSS chuta en musique. Découvrez nos articles et collections." },
      { property: "og:title", content: "POGI Histoire" },
      { property: "og:description", content: "Récits historiques, vidéos et collections." },
      { property: "og:image", content: heroConcert },
    ],
  }),
  component: Home,
});

const articles = [
  { img: aNapoleon, alt: "Napoléon" },
  { img: aWoman, alt: "Portrait ancien" },
  { img: aNazca, alt: "Lignes de Nazca" },
  { img: aAstro, alt: "Astronaute" },
  { img: aCave, alt: "Peinture rupestre" },
  { img: aNapoleon, alt: "Napoléon" },
];

const collections = [
  { img: cAntiquity, label: "L'Antiquité" },
  { img: cAmericas, label: "Les Amériques" },
  { img: cWWII, label: "Seconde Guerre Mondiale" },
  { img: cIllustres, label: "Les illustres" },
  { img: cAfrica, label: "L'Afrique" },
];

function Home() {
  return (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />

      {/* HERO */}
      <section className="relative h-[calc(100vh-60px)] min-h-[640px] w-full overflow-hidden">
        <img src={heroConcert} alt="Concert" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1280} />
        <div className="absolute inset-0" style={{ background: "rgba(170, 20, 20, 0.55)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

        <div className="absolute top-6 left-6 flex flex-wrap gap-2">
          <span className="pill">Dernière sortie</span>
          <span className="pill">Vidéo</span>
          <span className="pill">URSS</span>
        </div>
        <div className="absolute top-6 right-6">
          <span className="pogi-logo-outline text-3xl">POGI</span>
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] h-full px-6 flex flex-col justify-center">
          <div className="max-w-4xl">
            <h1 className="hero-title-yellow font-display text-[120px] sm:text-[160px] lg:text-[180px] leading-none">
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
                <a href="#" className="text-pogi-yellow font-bold hover:underline">voir plus</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLES À LA UNE */}
      <section className="section-pad bg-pogi-dark">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="font-display text-4xl md:text-[36px] uppercase mb-6">Articles à la Une</h2>
          <HScroll>
            {articles.map((a, i) => (
              <article key={i} className="relative shrink-0 w-[160px] h-[220px] rounded-[16px] overflow-hidden card-hover cursor-pointer">
                <img src={a.img} alt={a.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
              </article>
            ))}
          </HScroll>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="pb-16 bg-pogi-dark">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="font-display text-4xl md:text-[36px] uppercase mb-6">Collections</h2>
          <HScroll>
            {collections.map((c) => (
              <Link
                to="/collections"
                key={c.label}
                className="relative shrink-0 w-[180px] h-[180px] rounded-[16px] overflow-hidden card-hover"
              >
                <img src={c.img} alt={c.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30" />
                <span className="absolute inset-0 grid place-items-center text-center text-white font-bold text-base px-3">
                  {c.label}
                </span>
              </Link>
            ))}
          </HScroll>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-pogi-gray section-pad">
        <div className="mx-auto max-w-[1400px] px-6 grid md:grid-cols-[3fr_2fr] gap-10 items-center">
          <div>
            <h2 className="text-white font-bold text-2xl mb-3">Newsletter</h2>
            <p className="text-white text-base mb-2">Nos recommandations chaque semaine dans votre boîte mail.</p>
            <p className="text-white/70 text-[13px] mb-6">
              En vous abonnant, vous acceptez de recevoir nos communications. Vous pouvez vous désabonner à tout moment.
            </p>
            <form className="flex gap-2 max-w-md">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="flex-1 rounded-[16px] bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-pogi-yellow"
              />
              <button
                type="submit"
                className="rounded-[16px] bg-pogi-yellow text-pogi-dark font-bold px-6 py-3 hover:brightness-105 transition"
              >
                S'abonner
              </button>
            </form>
          </div>
          <div className="relative aspect-square max-w-sm mx-auto rounded-[16px] overflow-hidden">
            <img src={books} alt="Vieux livres" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute top-4 right-4 bg-pogi-yellow text-pogi-dark font-display text-lg px-3 py-1 rounded-full shadow-lg">
              POGI
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
