import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Bookmark, Share2 } from "lucide-react";

import heroRenaissance from "@/assets/hero-renaissance.jpg";

export const Route = createFileRoute("/articles/le-roi-et-le-genie")({
  head: () => ({
    meta: [
      { title: "Le Roi et le Génie — POGI Histoire" },
      { name: "description", content: "Les piliers de la Renaissance : François Ier et Léonard de Vinci, récit d'une rencontre fondatrice." },
      { property: "og:title", content: "Le Roi et le Génie" },
      { property: "og:description", content: "Les piliers de la Renaissance." },
      { property: "og:image", content: heroRenaissance },
    ],
  }),
  component: ArticleView,
});

function ArticleView() {
  return (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />

      <article>
        {/* Hero */}
        <header className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
          <img src={heroRenaissance} alt="Le Roi et le Génie" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 mx-auto max-w-[1100px] h-full px-6 flex flex-col items-end justify-end pb-12 text-right">
            <h1 className="font-display text-white text-[44px] md:text-[52px] uppercase leading-none">
              Le Roi et le Génie
            </h1>
            <p className="mt-2 italic text-white/90 text-2xl md:text-[32px]">
              Les piliers de la Renaissance
            </p>
          </div>
        </header>

        {/* Meta */}
        <div className="mx-auto max-w-[820px] px-6 py-8 border-b border-black/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="italic font-bold text-sm">POGI Histoire par Guillaume GUEST</p>
              <p className="text-gray-500 text-[13px] mt-1">
                Publié aujourd'hui à 20h00 · Temps de Lecture 1 min.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-full bg-pogi-dark/90 text-white px-4 py-2 text-sm hover:bg-pogi-dark">
                <Bookmark size={14} /> Plus tard
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-pogi-dark/90 text-white px-4 py-2 text-sm hover:bg-pogi-dark">
                <Share2 size={14} /> Partage
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-[820px] px-6 py-12 text-[16px] leading-[1.7]">
          <p className="text-lg leading-[1.7] mb-6">
            À Amboise, en mai 1519, un vieil homme s'éteint dans les bras d'un roi. Léonard de Vinci, le
            génie florentin, meurt aux côtés de François I<sup>er</sup>, son protecteur. Cette scène —
            réelle ou mythifiée par Ingres trois siècles plus tard — résume l'esprit d'une époque où le
            pouvoir et la création s'entendent comme rarement dans l'histoire.
          </p>

          <h2 className="font-bold text-xl mt-10 mb-3">Une rencontre fondatrice</h2>
          <p className="mb-4">
            Lorsque François I<sup>er</sup> revient d'Italie après Marignan, il rapporte plus qu'une
            victoire militaire : il rapporte une vision. Celle d'une cour brillante, peuplée d'artistes,
            d'architectes et de savants. Léonard, alors âgé de soixante-quatre ans, accepte l'invitation
            royale et s'installe au Clos Lucé avec ses carnets, ses inventions et la Joconde.
          </p>

          <h2 className="font-bold text-xl mt-10 mb-3">Les piliers d'un renouveau</h2>
          <p className="mb-4">
            La Renaissance française s'enracine alors dans trois piliers que ce couple improbable incarne :
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li>L'humanisme — l'homme retrouve sa place au centre du monde.</li>
            <li>L'art — la beauté devient un langage politique et spirituel.</li>
            <li>La science — observer, mesurer, inventer pour comprendre.</li>
          </ul>

          <h2 className="font-bold text-xl mt-10 mb-3">Un héritage durable</h2>
          <p className="mb-4">
            De Chambord à Fontainebleau, l'empreinte de cette alliance se lit dans la pierre. Mais
            au-delà des châteaux, c'est une certaine idée de la France qui s'installe — celle d'un pays
            où le roi protège les arts, et où l'artiste éclaire le roi.
          </p>

          <p className="italic text-gray-600 mt-10">
            Pour aller plus loin, retrouvez nos vidéos consacrées à la Renaissance dans la collection
            "Les illustres".
          </p>
        </div>
      </article>

      <Footer />
    </div>
  );
}
