import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InternalLinks } from "@/components/InternalLinks";
import { Skeleton } from "@/components/Skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SITE_URL, absUrl } from "@/lib/site";

type VideoMeta = {
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  category: string | null;
  published_at: string | null;
};

type Video = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  format: "court" | "long";
  category: string | null;
  published_at: string | null;
};

function clip(text: string | null | undefined, max: number, fallback: string) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return fallback;
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export const Route = createFileRoute("/videos/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("videos")
      .select("title,slug,subtitle,description,thumbnail_url,video_url,category,published_at")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    return { meta: (data as VideoMeta | null) ?? null };
  },
  head: ({ params, loaderData }) => {
    const v = loaderData?.meta ?? null;
    const url = `${SITE_URL}/videos/${params.slug}`;
    const title = clip(v?.title, 60, "Vidéo — POGI Histoire");
    const description = clip(
      v?.description ?? v?.subtitle ?? v?.title,
      158,
      "Une vidéo d'histoire documentée et sourcée, publiée par POGI Histoire.",
    );
    const image = v?.thumbnail_url ? absUrl(v.thumbnail_url) : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.other" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: v
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "VideoObject",
                name: v.title,
                description,
                url,
                ...(image ? { thumbnailUrl: [image] } : {}),
                ...(v.published_at ? { uploadDate: v.published_at } : {}),
                contentUrl: v.video_url,
                publisher: { "@type": "Organization", name: "POGI Histoire" },
              }),
            },
          ]
        : [],
    };
  },
  component: VideoBySlug,
  notFoundComponent: () => (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />
      <main>
      <div className="max-w-[820px] mx-auto px-6 py-24 text-center">
        <p className="text-pogi-yellow uppercase tracking-widest text-xs mb-3">404</p>
        <h1 className="font-display text-4xl uppercase">Vidéo introuvable</h1>
        <p className="text-white/70 mt-3">Elle a peut-être été déplacée ou dépubliée.</p>
        <Link to="/videos" className="inline-block mt-8 bg-pogi-yellow text-pogi-dark font-bold uppercase px-5 py-2 rounded-md">
          Retour aux vidéos
        </Link>
      </div>
      </main>
      <Footer />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />
      <main>
      <div className="max-w-[820px] mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl uppercase">Erreur</h1>
        <p className="text-white/70 mt-3 text-sm">{error.message}</p>
        <Link to="/videos" className="inline-block mt-8 bg-pogi-yellow text-pogi-dark font-bold uppercase px-5 py-2 rounded-md">
          Retour aux vidéos
        </Link>
      </div>
      </main>
      <Footer />
    </div>
  ),
});

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
      const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    // Direct mp4 etc → no embed
    return null;
  } catch {
    return null;
  }
}

function VideoBySlug() {
  const { slug } = Route.useParams();
  const [video, setVideo] = useState<Video | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("videos")
      .select("id,title,slug,subtitle,description,video_url,thumbnail_url,format,category,published_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setVideo((data as Video) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (video === undefined) {
    return (
      <div className="min-h-screen bg-pogi-dark text-white">
        <Navbar />
      <main>
        <div className="mx-auto max-w-[1100px] px-6 py-10 space-y-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
        </main>
      <Footer />
      </div>
    );
  }
  if (video === null) throw notFound();

  const embed = toEmbedUrl(video.video_url);
  const publishedDate = video.published_at
    ? new Date(video.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-pogi-dark text-white">
      <Navbar />
      <main>
      <div className="mx-auto max-w-[1100px] px-6 pt-8 pb-16">
        <Link to="/videos" className="inline-flex items-center gap-2 text-white/60 hover:text-pogi-yellow text-sm uppercase tracking-wider mb-6">
          <ArrowLeft size={16} /> Toutes les vidéos
        </Link>

        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl shadow-black/50">
          {embed ? (
            <iframe
              src={embed}
              title={video.title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video src={video.video_url} controls poster={video.thumbnail_url ?? undefined} className="absolute inset-0 h-full w-full object-contain">
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            {video.category && (
              <span className="text-pogi-yellow uppercase tracking-wider text-xs font-bold">{video.category}</span>
            )}
            <h1 className="font-display text-3xl md:text-4xl uppercase leading-tight mt-2">{video.title}</h1>
            {video.subtitle && <p className="italic text-white/80 mt-2">{video.subtitle}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 uppercase tracking-wider">
              <span>{video.format === "long" ? "Format long" : "Format court"}</span>
              {publishedDate && <span>Publié le {publishedDate}</span>}
            </div>
          </div>
          <a
            href={video.video_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-pogi-yellow text-pogi-dark font-bold uppercase text-sm px-4 py-2.5 rounded-md hover:bg-pogi-yellow/90"
          >
            <ExternalLink size={16} /> Voir sur la source
          </a>
        </div>

        {video.description && (
          <div className="mt-10 max-w-[720px] text-white/85 leading-relaxed whitespace-pre-wrap">
            {video.description}
          </div>
        )}
      </div>
      <InternalLinks variant="dark" category={video.category} excludeVideoSlug={video.slug} />
      </main>
      <Footer />
    </div>
  );
}
