import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PlayCircle } from "lucide-react";

type LinkArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
};

type LinkVideo = {
  id: string;
  title: string;
  slug: string | null;
  subtitle: string | null;
  thumbnail_url: string | null;
  video_url: string;
  category: string | null;
  published_at: string | null;
};

export type InternalLinksProps = {
  /** Prefer items from this category first. */
  category?: string | null;
  /** Article slug to exclude (current page). */
  excludeArticleSlug?: string;
  /** Video slug to exclude (current page). */
  excludeVideoSlug?: string;
  /** Article ids pinned by the editor (shown first). */
  pinnedArticleIds?: string[];
  showArticles?: boolean;
  showVideos?: boolean;
  variant?: "light" | "dark";
  articlesTitle?: string;
  videosTitle?: string;
  className?: string;
};

function byRecent<T extends { published_at: string | null }>(a: T, b: T) {
  return (
    (b.published_at ? new Date(b.published_at).getTime() : 0) -
    (a.published_at ? new Date(a.published_at).getTime() : 0)
  );
}

/** Rank by category match first, then by recency, keeping pinned items at the top. */
function pick<T extends { id: string; category: string | null; published_at: string | null }>(
  items: T[],
  category: string | null | undefined,
  pinnedIds: string[],
  limit: number,
) {
  const out = new Map<string, T>();
  for (const id of pinnedIds) {
    const hit = items.find((i) => i.id === id);
    if (hit) out.set(hit.id, hit);
    if (out.size >= limit) return Array.from(out.values());
  }
  const sorted = [...items].sort(byRecent);
  if (category) {
    for (const i of sorted) {
      if (out.has(i.id)) continue;
      if (i.category === category) out.set(i.id, i);
      if (out.size >= limit) return Array.from(out.values());
    }
  }
  for (const i of sorted) {
    if (out.has(i.id)) continue;
    out.set(i.id, i);
    if (out.size >= limit) break;
  }
  return Array.from(out.values());
}

/**
 * Internal-linking block: "Articles connexes" + "Vidéos recommandées".
 * Purely presentational discovery module reused across every public page.
 */
export function InternalLinks({
  category,
  excludeArticleSlug,
  excludeVideoSlug,
  pinnedArticleIds = [],
  showArticles = true,
  showVideos = true,
  variant = "light",
  articlesTitle = "Articles connexes",
  videosTitle = "Vidéos recommandées",
  className = "",
}: InternalLinksProps) {
  const [articles, setArticles] = useState<LinkArticle[]>([]);
  const [videos, setVideos] = useState<LinkVideo[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (showArticles) {
      supabase
        .from("articles")
        .select("id,title,slug,excerpt,category,image_url,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(24)
        .then(({ data }) => {
          if (!cancelled) setArticles((data as LinkArticle[]) ?? []);
        });
    }
    if (showVideos) {
      supabase
        .from("videos")
        .select("id,title,slug,subtitle,thumbnail_url,video_url,category,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(24)
        .then(({ data }) => {
          if (!cancelled) setVideos((data as LinkVideo[]) ?? []);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [showArticles, showVideos]);

  const relatedArticles = useMemo(
    () =>
      pick(
        articles.filter((a) => a.slug !== excludeArticleSlug),
        category,
        pinnedArticleIds,
        3,
      ),
    [articles, category, excludeArticleSlug, pinnedArticleIds],
  );

  const relatedVideos = useMemo(
    () => pick(videos.filter((v) => v.slug !== excludeVideoSlug), category, [], 3),
    [videos, category, excludeVideoSlug],
  );

  const hasArticles = showArticles && relatedArticles.length > 0;
  const hasVideos = showVideos && relatedVideos.length > 0;
  if (!hasArticles && !hasVideos) return null;

  const dark = variant === "dark";
  const wrap = dark
    ? "bg-pogi-dark text-white border-t border-white/10"
    : "bg-pogi-light text-pogi-dark border-t border-black/10";
  const cardCls = dark
    ? "group block rounded-[16px] overflow-hidden bg-white/5 border border-white/10 card-hover outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60"
    : "group block rounded-[16px] overflow-hidden bg-white border border-black/10 card-hover outline-none focus-visible:ring-4 focus-visible:ring-pogi-yellow/60";
  const subCls = dark ? "text-white/70" : "text-gray-600";
  const hoverTitle = dark ? "group-hover:text-pogi-yellow" : "group-hover:text-pogi-blue";

  return (
    <aside aria-label="Liens internes" className={`${wrap} ${className}`}>
      <div className="mx-auto max-w-[1100px] px-6 py-12 space-y-12">
        {hasArticles && (
          <section>
            <h2 className="font-display uppercase text-2xl md:text-3xl mb-6">{articlesTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {relatedArticles.map((a) => (
                <Link
                  key={a.id}
                  to="/articles/$slug"
                  params={{ slug: a.slug }}
                  preload="intent"
                  className={cardCls}
                >
                  <div className={`relative aspect-[16/10] overflow-hidden ${dark ? "bg-white/10" : "bg-black/5"}`}>
                    {a.image_url && (
                      <img
                        src={a.image_url}
                        alt={a.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    {a.category && (
                      <span className="text-pogi-yellow uppercase tracking-wider text-[11px]">{a.category}</span>
                    )}
                    <h3 className={`font-display uppercase text-lg leading-tight mt-1 transition-colors ${hoverTitle}`}>
                      {a.title}
                    </h3>
                    {a.excerpt && <p className={`text-sm mt-1 line-clamp-2 ${subCls}`}>{a.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {hasVideos && (
          <section>
            <h2 className="font-display uppercase text-2xl md:text-3xl mb-6">{videosTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {relatedVideos.map((v) => {
                const inner = (
                  <>
                    <div className="relative aspect-video bg-black overflow-hidden">
                      {v.thumbnail_url && (
                        <img
                          src={v.thumbnail_url}
                          alt={v.title}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <span className="absolute inset-0 grid place-items-center">
                        <PlayCircle className="text-white/85 drop-shadow" size={40} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="p-4">
                      {v.category && (
                        <span className="text-pogi-yellow uppercase tracking-wider text-[11px]">{v.category}</span>
                      )}
                      <h3 className={`font-display uppercase text-lg leading-tight mt-1 transition-colors ${hoverTitle}`}>
                        {v.title}
                      </h3>
                      {v.subtitle && <p className={`text-sm mt-1 line-clamp-2 ${subCls}`}>{v.subtitle}</p>}
                    </div>
                  </>
                );
                return v.slug ? (
                  <Link key={v.id} to="/videos/$slug" params={{ slug: v.slug }} preload="intent" className={cardCls}>
                    {inner}
                  </Link>
                ) : (
                  <a key={v.id} href={v.video_url} target="_blank" rel="noreferrer" className={cardCls}>
                    {inner}
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
