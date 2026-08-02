import { createFileRoute } from "@tanstack/react-router";
import { Youtube } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InternalLinks } from "@/components/InternalLinks";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos — POGI Histoire" },
      {
        name: "description",
        content:
          "POGI Histoire, média indépendant consacré à l'histoire, porté par Guillaume Guest et Paul Lesaulnier. Des récits documentés, sourcés et vérifiés, en articles et bientôt en vidéo.",
      },
      { property: "og:title", content: "À propos — POGI Histoire" },
      {
        property: "og:description",
        content:
          "POGI Histoire, média indépendant consacré à l'histoire, porté par Guillaume Guest et Paul Lesaulnier. Des récits documentés, sourcés et vérifiés, en articles et bientôt en vidéo.",
      },
      { property: "og:url", content: "https://pogi-histoire.lovable.app/a-propos" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pogi-histoire.lovable.app/a-propos" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <main className="mx-auto max-w-[820px] px-6 py-16 md:py-24">
        <Reveal>
          <p className="text-pogi-yellow uppercase tracking-widest text-xs font-bold mb-3">POGI Histoire</p>
          <h1 className="font-display uppercase text-[40px] md:text-[56px] leading-[1.05]">
            À propos de POGI Histoire
          </h1>
        </Reveal>

        <Reveal>
          <div className="mt-10 space-y-6 text-[17px] leading-[1.75] text-pogi-dark/90">
            <p>
              <strong>POGI Histoire</strong> est un média indépendant consacré à l'histoire, porté
              par <strong>Guillaume Guest</strong> et <strong>Paul Lesaulnier</strong>.
            </p>
            <p>
              On y raconte des événements marquants en cherchant à comprendre ce qui s'est joué
              derrière : les rapports de force, les décisions, ce qu'on a préféré taire. Une date
              seule n'explique jamais grand-chose.
            </p>
            <p>
              Chaque sujet est documenté et vérifié à partir de travaux d'historiens, d'archives et
              de sources primaires quand elles sont accessibles. Les sources sont citées en fin
              d'article. Quand les historiens ne s'accordent pas entre eux, sur un bilan humain par
              exemple, nous le précisons au lieu de trancher.
            </p>
            <p>
              Les récits paraissent ici en articles, et bientôt en vidéo sur la chaîne YouTube{" "}
              <strong>POGI Histoire</strong>.
            </p>
            <p>Si vous repérez une erreur ou si vous avez une idée de sujet, écrivez-nous.</p>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <a
              href="https://www.youtube.com/@PogiHistoire"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-pogi-dark text-white px-5 py-3 font-semibold hover:bg-pogi-red transition-colors"
            >
              <Youtube size={18} /> La chaîne YouTube POGI Histoire
            </a>
            <a
              href="mailto:paul.lesaulnier27@gmail.com"
              className="inline-flex items-center gap-2 rounded-full border border-pogi-dark/20 px-5 py-3 font-semibold hover:border-pogi-yellow hover:text-pogi-dark transition-colors"
            >
              Nous écrire
            </a>
          </div>
        </Reveal>
      <InternalLinks variant="light" showArticles={false} videosTitle="Vidéos recommandées" />
      </main>
      <Footer />
    </div>
  );
}
