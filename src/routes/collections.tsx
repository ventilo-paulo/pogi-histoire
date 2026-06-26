import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import vOradour from "@/assets/video-oradour.jpg";
import cManhattan from "@/assets/coll-manhattan.jpg";
import cWWII from "@/assets/coll-wwii.jpg";
import cAntiquity from "@/assets/coll-antiquity.jpg";
import cJustinian from "@/assets/coll-justinian.jpg";
import v536 from "@/assets/video-536.jpg";
import cBayeux from "@/assets/coll-bayeux.jpg";
import cMedieval from "@/assets/coll-medieval.jpg";
import cKaamelott from "@/assets/coll-kaamelott.jpg";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — POGI Histoire" },
      { name: "description", content: "Explorez les collections POGI : Seconde Guerre Mondiale, Antiquité, Moyen-Âge et plus." },
      { property: "og:title", content: "Collections — POGI Histoire" },
      { property: "og:description", content: "Toutes les collections d'histoire de POGI." },
      { property: "og:image", content: cWWII },
    ],
  }),
  component: CollectionsPage,
});

function Card({
  img, title, subtitle, className = "", textSize = "text-xl",
}: { img?: string; title?: React.ReactNode; subtitle?: string; className?: string; textSize?: string }) {
  return (
    <article className={`relative rounded-[16px] overflow-hidden card-hover cursor-pointer bg-black ${className}`}>
      {img && <img src={img} alt={typeof title === "string" ? title : ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      {title && (
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className={`font-bold text-white leading-tight ${textSize}`}>{title}</h3>
          {subtitle && <p className="text-white/80 italic text-sm mt-1">{subtitle}</p>}
        </div>
      )}
    </article>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[32px] text-pogi-dark uppercase mb-5">{children}</h2>;
}

function CollectionsPage() {
  return (
    <div className="min-h-screen bg-pogi-light">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-20">

        {/* WWII */}
        <section className="mb-14">
          <Heading>Seconde Guerre Mondiale</Heading>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[220px]">
            <Card img={vOradour} title="Oradour, village martyr" subtitle="Mémoire d'un massacre" className="md:col-span-2 md:row-span-2 min-h-[220px]" textSize="text-2xl" />
            <Card img={cManhattan} title="Projet Manhattan" subtitle="La nature humaine" className="md:col-span-1 min-h-[220px]" />
            <Card
              img={cWWII}
              className="md:col-span-1 md:row-span-2 min-h-[220px]"
              title={
                <span className="flex flex-col gap-2">
                  <span>L'incident de Mukden</span>
                  <span className="text-base font-normal">La guerre de 15 ans</span>
                  <span className="text-base font-normal italic text-white/70">L'oubliée des mémoires</span>
                </span>
              }
            />
            <Card img={cManhattan} title="Hiroshima" subtitle="6 août 1945" className="md:col-span-1 min-h-[220px]" />
          </div>
        </section>

        {/* Antiquity */}
        <section className="mb-14">
          <Heading>Antiquité</Heading>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 auto-rows-[220px]">
            <Card img={cAntiquity} title="Forum" className="md:col-span-1" />
            <article className="rounded-[16px] bg-black col-span-1 grid place-items-center text-white/30 text-xs uppercase tracking-wider">
              À venir
            </article>
            <Card
              img={cJustinian}
              className="col-span-2 md:col-span-2"
              title={
                <span className="font-display text-3xl text-pogi-yellow leading-none">
                  Justinien 1<sup>er</sup>
                  <span className="block text-lg text-white mt-1">L'Empire contre-attaque</span>
                </span>
              }
            />
            <Card img={v536} title="La pire année de l'histoire ?" subtitle="536" className="col-span-2 md:col-span-2" />
          </div>
        </section>

        {/* Middle Ages */}
        <section>
          <Heading>Moyen-Âge</Heading>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 auto-rows-[220px]">
            <Card
              img={cBayeux}
              className="md:col-span-1 min-h-[220px]"
              title={
                <span className="flex flex-col">
                  <span className="text-base">Les conquêtes Normandes</span>
                  <span className="text-sm italic font-normal text-white/80 mt-1">L'histoire derrière Bayeux</span>
                </span>
              }
            />
            <Card img={cMedieval} title="Se battre comme au Moyen-Âge" subtitle="La reconstitution" className="md:col-span-2 min-h-[220px]" textSize="text-2xl" />
            <Card img={cKaamelott} title="T'as la rèf ?" subtitle="Kaamelott" className="md:col-span-2 min-h-[220px]" textSize="text-2xl" />
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
