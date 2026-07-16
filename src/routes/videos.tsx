import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HScroll } from "@/components/HScroll";
import { Reveal } from "@/components/Reveal";
import { Skeleton } from "@/components/Skeleton";
import { Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { absUrl } from "@/lib/site";


import vOradour from "@/assets/video-oradour.jpg";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Vidéos — POGI Histoire" },
      { name: "description", content: "Toutes les vidéos publiées par POGI Histoire, avec une page dédiée par épisode." },
      { property: "og:title", content: "Vidéos — POGI Histoire" },
      { property: "og:description", content: "Vidéos d'histoire, longs formats et recommandations." },
      { property: "og:image", content: absUrl(vOradour) },
      { name: "twitter:image", content: absUrl(vOradour) },
    ],
  }),
  component: VideosPage,
});

type Video = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  video_url: string;
  format: "court" | "long";
  category: string | null;
};

function VideosPage() {
  const [items, setItems] = useState<Video[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase
        .from("videos")
        .select("id,slug,title,subtitle,thumbnail_url,video_url,format,category")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .then(({ data }) => {
          if (!cancelled) setItems((data ?? []) as Video[]);
        });
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const ch = supabase
      .channel("videos-pub")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(ch);
    };
  }, []);

  const longs = (items ?? []).filter((v) => v.format === "long");
  const shorts = (items ?? []).filter((v) => v.format !== "long");

  return (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-20">
        <Reveal>
          <p className="text-pogi-yellow uppercase tracking-widest text-xs font-bold mb-3">Chaîne POGI</p>
          <h1 className="font-display text-4xl md:text-[52px] uppercase leading-none mb-8">Vidéos</h1>
        </Reveal>

        {items === null ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="shrink-0 w-[350px] aspect-video rounded-[12px]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <VideoIcon size={40} className="mx-auto text-pogi-yellow mb-4" />
            <p className="font-display text-2xl uppercase">Aucune vidéo publiée pour le moment</p>
            <p className="text-white/60 mt-2 max-w-md mx-auto">
              Les vidéos synchronisées depuis Notion apparaîtront ici, chacune avec sa page dédiée.
            </p>
          </div>
        ) : (
          <>
            <VRow title="Vidéos récentes">
              {shorts.map((v) => <VCard key={v.id} v={v} />)}
            </VRow>
            {longs.length > 0 && (
              <VRow title="Long format">
                {longs.map((v) => <VCard key={v.id} v={v} />)}
              </VRow>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

function VRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <Reveal>
        <h2 className="font-display text-[36px] text-white uppercase mb-5">{title}</h2>
      </Reveal>
      <HScroll>{children}</HScroll>
    </section>
  );
}

function VCard({ v }: { v: Video }) {
  const inner = (
    <>
      {v.thumbnail_url && (
        <img
          src={v.thumbnail_url}
          alt={v.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-4 right-4">
        <h3 className="text-white font-bold text-lg leading-tight">{v.title}</h3>
        {v.subtitle && <p className="text-white/85 italic text-sm mt-1">{v.subtitle}</p>}
      </div>
    </>
  );
  const cls =
    "group relative shrink-0 w-[350px] aspect-video rounded-[12px] overflow-hidden card-hover bg-black block outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60";

  if (v.slug) {
    return (
      <Link to="/videos/$slug" params={{ slug: v.slug }} preload="intent" aria-label={v.title} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={v.video_url} target="_blank" rel="noreferrer" aria-label={v.title} className={cls}>
      {inner}
    </a>
  );
}


