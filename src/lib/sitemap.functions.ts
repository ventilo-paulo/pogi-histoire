import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_URL = "https://pogi-histoire.com";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/**
 * Regenerate the sitemap (bypassing the edge cache), report its contents and
 * resubmit it to Search Console when the connector is available.
 */
export const sitemapRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);

    const url = `${SITE_URL}/sitemap.xml?refresh=${Date.now()}`;
    const res = await fetch(url, {
      headers: { "Cache-Control": "no-cache", "User-Agent": "pogi-sitemap-refresh/1.0" },
    });
    if (!res.ok) throw new Error(`Le sitemap a répondu ${res.status}.`);
    const xml = await res.text();

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const articles = locs.filter((l) => l.includes("/articles/")).length;
    const videos = locs.filter((l) => l.includes("/videos/")).length;

    let submitted = false;
    let submitError: string | null = null;
    try {
      const { submitSitemapToSearchConsole } = await import("./gsc.functions");
      await submitSitemapToSearchConsole();
      submitted = true;
    } catch (e) {
      submitError = e instanceof Error ? e.message : String(e);
    }

    return {
      sitemapUrl: `${SITE_URL}/sitemap.xml`,
      total: locs.length,
      articles,
      videos,
      pages: locs.length - articles - videos,
      submitted,
      submitError,
      refreshedAt: new Date().toISOString(),
    };
  });
