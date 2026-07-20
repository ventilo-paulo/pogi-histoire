import { createFileRoute } from "@tanstack/react-router";
import { Youtube } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos — POGI Histoire" },
      {
        name: "description",
        content:
          "POGI Histoire est un média indépendant consacré à l'histoire, porté par Paul, journaliste. Récits documentés et sourcés, en articles et bientôt en vidéos.",
      },
      { property: "og:title", content: "À propos — POGI Histoire" },
      {
        property: "og:description",
        content: "Média indépendant d'histoire, porté par Paul, journaliste.",
      },
    ],
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
              <strong>POGI Histoire</strong> est un média indépendant consacré à l'histoire et à
              ses moments marquants, porté par <strong>Paul</strong>, journaliste.
            </p>
            <p>
              Des récits documentés et sourcés, vérifiés auprès de références historiques,
              publiés en articles et bientôt en vidéos via la chaîne YouTube{" "}
              <strong>POGI Histoire</strong>.
            </p>
            <p>Chaque article cite ses sources en fin de texte.</p>
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
      </main>
      <Footer />
    </div>
  );
}
