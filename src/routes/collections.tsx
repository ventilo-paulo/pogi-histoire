import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { absUrl } from "@/lib/site";

import cWWII from "@/assets/coll-wwii.jpg";
import cIllustresAsset from "@/assets/coll-illustres.jpg.asset.json";
const cIllustres = cIllustresAsset.url;


export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — POGI Histoire" },
      { name: "description", content: "Explorez les collections POGI : Seconde Guerre Mondiale, Antiquité, Moyen-Âge, Les Amériques, Les illustres et L'Afrique." },
      { property: "og:title", content: "Collections — POGI Histoire" },
      { property: "og:description", content: "Toutes les collections d'histoire de POGI." },
      { property: "og:image", content: absUrl(cWWII) },
      { name: "twitter:image", content: absUrl(cWWII) },
    ],
  }),
  component: CollectionsPage,
});

type CardProps = {
  img?: string;
  title?: React.ReactNode;
  subtitle?: string;
  className?: string;
  textSize?: string;
  to?: "/articles" | "/videos";
  search?: Record<string, string>;
  href?: string;
};

function Card({ img, title, subtitle, className = "", textSize = "text-xl", to, search, href }: CardProps) {
  const alt = typeof title === "string" ? title : "";
  const inner = (
    <>
      {img && <img src={img} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      {title && (
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className={`font-bold text-white leading-tight ${textSize}`}>{title}</h3>
          {subtitle && <p className="text-white/80 italic text-sm mt-1">{subtitle}</p>}
        </div>
      )}
    </>
  );
  const cls = `group relative rounded-[16px] overflow-hidden card-hover cursor-pointer bg-black block outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60 ${className}`;
  if (href) {
    return <a href={href} target="_blank" rel="noreferrer" aria-label={alt} className={cls}>{inner}</a>;
  }
  if (to) {
    return <Link to={to} search={search as never} aria-label={alt} className={cls}>{inner}</Link>;
  }
  return <article className={cls}>{inner}</article>;
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <h2 className="font-display text-[32px] text-pogi-dark uppercase mb-5">{children}</h2>
    </Reveal>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="empty-state uppercase tracking-wider text-sm">
      {label} — bientôt en ligne
    </div>
  );
}


function CollectionsPage() {
  return (
    <div className="min-h-screen bg-pogi-light">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-20">

        {/* WWII */}
        <section id="wwii" className="mb-14 scroll-mt-24">
          <Heading>Seconde Guerre Mondiale</Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
            <Empty label="Seconde Guerre Mondiale" />
          </div>
        </section>

        {/* Antiquity */}
        <section id="antiquite" className="mb-14 scroll-mt-24">
          <Heading>Antiquité</Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
            <Empty label="Antiquité" />
          </div>
        </section>

        {/* Middle Ages */}
        <section id="moyen-age" className="mb-14 scroll-mt-24">
          <Heading>Moyen-Âge</Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
            <Empty label="Moyen-Âge" />
          </div>
        </section>


        {/* Les Amériques */}
        <section id="ameriques" className="mb-14 scroll-mt-24">
          <Heading>Les Amériques</Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
            <Empty label="Amériques" />
          </div>
        </section>

        {/* Les illustres */}
        <section id="illustres" className="mb-14 scroll-mt-24">
          <Heading>Les illustres</Heading>
          <div className="relative w-full h-[320px] md:h-[420px] rounded-[16px] overflow-hidden mb-4">
            <img
              src={cIllustres}
              alt="Simone Veil, 1984 — portrait par Rob Croes / Anefo (Nationaal Archief, CC0)"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "center 70%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="font-display text-2xl md:text-3xl uppercase leading-tight">Simone Veil</h3>
              <p className="text-white/80 text-sm italic mt-1">1984 — Rob Croes / Anefo, Nationaal Archief (CC0)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
            <Empty label="Portraits" />
          </div>
        </section>

        {/* L'Afrique */}
        <section id="afrique" className="scroll-mt-24">
          <Heading>L'Afrique</Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
            <Empty label="Afrique" />
          </div>
        </section>


      </div>
      <Footer />
    </div>
  );
}
