import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://pogi-histoire.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  image?: string;
  imageTitle?: string;
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function loc(path: string) {
  return esc(
    `${BASE_URL}${path
      .split("/")
      .map((segment, i) => (i === 0 ? segment : encodeURIComponent(decodeURIComponent(segment))))
      .join("/")}`,
  );
}

function absImage(url: string | null | undefined) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return undefined;
}

function day(value?: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/articles", changefreq: "daily", priority: "0.9" },
          { path: "/videos", changefreq: "weekly", priority: "0.8" },
          { path: "/interviews", changefreq: "weekly", priority: "0.8" },
          { path: "/collections", changefreq: "monthly", priority: "0.7" },
          { path: "/a-propos", changefreq: "yearly", priority: "0.5" },
        ];

        let newestArticle: string | undefined;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: articles } = await supabaseAdmin
            .from("articles")
            .select("slug,title,image_url,updated_at,published_at")
            .eq("published", true)
            .order("published_at", { ascending: false });

          for (const a of articles ?? []) {
            if (!a.slug) continue;
            const lastmod = day(a.updated_at) ?? day(a.published_at);
            if (lastmod && (!newestArticle || lastmod > newestArticle)) newestArticle = lastmod;
            entries.push({
              path: `/articles/${a.slug}`,
              lastmod,
              changefreq: "monthly",
              priority: "0.8",
              image: absImage(a.image_url),
              imageTitle: a.title ?? undefined,
            });
          }

          const { data: videos } = await supabaseAdmin
            .from("videos")
            .select("slug,title,thumbnail_url,published_at")
            .eq("published", true)
            .order("published_at", { ascending: false });

          for (const v of videos ?? []) {
            if (!v.slug) continue;
            entries.push({
              path: `/videos/${v.slug}`,
              lastmod: day(v.published_at),
              changefreq: "monthly",
              priority: "0.6",
              image: absImage((v as { thumbnail_url?: string | null }).thumbnail_url),
              imageTitle: v.title ?? undefined,
            });
          }
        } catch (e) {
          console.error("sitemap: failed to load content", e);
        }

        // Home and index pages track the freshest published content.
        if (newestArticle) {
          for (const e of entries) {
            if (e.path === "/" || e.path === "/articles") e.lastmod = newestArticle;
          }
        }

        // Deduplicate on path, keep first occurrence (highest priority source).
        const seen = new Set<string>();
        const unique = entries.filter((e) => !seen.has(e.path) && seen.add(e.path));

        const urls = unique.map((e) =>
          [
            `  <url>`,
            `    <loc>${loc(e.path)}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            e.image
              ? [
                  `    <image:image>`,
                  `      <image:loc>${esc(e.image)}</image:loc>`,
                  e.imageTitle ? `      <image:title>${esc(e.imageTitle)}</image:title>` : null,
                  `    </image:image>`,
                ]
                  .filter(Boolean)
                  .join("\n")
              : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
            "X-Sitemap-Urls": String(unique.length),
          },
        });
      },
    },
  },
});
