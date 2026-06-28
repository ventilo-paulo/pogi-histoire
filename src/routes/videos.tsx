import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HScroll } from "@/components/HScroll";
import { Play, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import vOradour from "@/assets/video-oradour.jpg";
import v536 from "@/assets/video-536.jpg";
import vCuba from "@/assets/video-cuba.jpg";
import vCites from "@/assets/video-cites.jpg";
import vCreator from "@/assets/video-creator.jpg";
import vChernobyl from "@/assets/video-chernobyl.jpg";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Vidéos — POGI Histoire" },
      { name: "description", content: "Les vidéos récentes de POGI Histoire : Oradour, 536, Révolution Cubaine, Tchernobyl et plus." },
      { property: "og:title", content: "Vidéos — POGI Histoire" },
      { property: "og:description", content: "Vidéos d'histoire, recommandations et long format." },
      { property: "og:image", content: vOradour },
    ],
  }),
  component: VideosPage,
});

function VCard({
  img, title, subtitle, overlayClassName,
}: { img: string; title: string; subtitle?: string; overlayClassName?: string }) {
  return (
    <article className="relative shrink-0 w-[350px] aspect-video rounded-[12px] overflow-hidden card-hover cursor-pointer bg-black">
      <img src={img} alt={title} loading="lazy" className={`absolute inset-0 h-full w-full object-cover ${overlayClassName ?? ""}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-4 right-4">
        <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
        {subtitle && <p className="text-white/85 italic text-sm mt-1">{subtitle}</p>}
      </div>
    </article>
  );
}

function VRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-display text-[36px] text-pogi-dark uppercase mb-5">{title}</h2>
      <HScroll dark={false}>{children}</HScroll>
    </section>
  );
}

function VideosPage() {
  return (
    <div className="min-h-screen bg-pogi-light">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-20">
        <PublishedVideosSection />

        <VRow title="Vidéos récentes">
          <VCard img={vOradour} title="Oradour, village martyr" subtitle="Mémoire d'un massacre" />
          <VCard img={v536} title="536" subtitle="La pire année de l'histoire ?" />
          <VCard img={vCuba} title="[Révolution Cubaine]" subtitle="Aux racines d'une utopie" />
        </VRow>

        <VRow title="Recommandation">
          <VCard img={vCites} title="T'as la rèf ?" subtitle="Les mystérieuses cités d'Or" />
          <VCard img={vCreator} title="[Invité créateur]" subtitle="Une voix de l'histoire en ligne" />
          <VCard img={vChernobyl} title="Tchernobyl" subtitle="Anatomie d'une catastrophe" />
        </VRow>

        <section>
          <h2 className="font-display text-[36px] text-pogi-dark uppercase mb-5">Long format / making of</h2>
          <HScroll dark={false}>
            {[0, 1, 2].map((i) => (
              <article
                key={i}
                className="relative shrink-0 w-[350px] aspect-video rounded-[12px] overflow-hidden card-hover cursor-pointer"
                style={{ background: "#0A0A0A" }}
              >
                <div className="absolute inset-0 grid place-items-center text-white/70">
                  {i === 2 ? (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 backdrop-blur">
                      <Play size={28} fill="white" />
                    </div>
                  ) : (
                    <Lock size={32} />
                  )}
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-white/60 text-sm uppercase tracking-wider">À venir</p>
                </div>
              </article>
            ))}
          </HScroll>
        </section>
      </div>
      <Footer />
    </div>
  );
}
