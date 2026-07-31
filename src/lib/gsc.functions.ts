import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE_URL = "https://pogi-histoire.lovable.app";

type SiteEntry = { siteUrl: string; permissionLevel?: string };

function gatewayHeaders() {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const connectionApiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableApiKey || !connectionApiKey) {
    throw new Error("Search Console n'est pas connecté à ce projet.");
  }
  return {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionApiKey,
  };
}

async function gsc(path: string, init?: RequestInit, attempt = 0): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`${GATEWAY}${path}`, {
      ...init,
      headers: { ...gatewayHeaders(), ...(init?.headers ?? {}) },
    });
  } catch (e) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
      return gsc(path, init, attempt + 1);
    }
    throw new Error("Search Console est momentanément injoignable. Réessayez dans quelques instants.");
  }
  if (!response.ok) {
    const body = await response.text();
    console.error(`GSC request failed [${response.status}] ${path}: ${body}`);
    // Transient gateway/upstream failures: retry with backoff before surfacing.
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
      return gsc(path, init, attempt + 1);
    }
    if (response.status === 429 || response.status >= 500) {
      throw new Error(
        "Search Console est momentanément indisponible (erreur passagère du service Google). Réessayez dans quelques instants.",
      );
    }
    throw new Error(`Search Console a répondu ${response.status}: ${body.slice(0, 400)}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}


function coversTarget(siteUrl: string, target: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    return target.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
}

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

async function listVerifiedProperties() {
  const { siteEntry = [] } = (await gsc("/webmasters/v3/sites")) as { siteEntry?: SiteEntry[] };
  const target = new URL(SITE_URL);
  return siteEntry.filter(
    (e) => e.permissionLevel !== "siteUnverifiedUser" && coversTarget(e.siteUrl, target),
  );
}

/** Sitemap status + list of verified properties covering the site. */
export const gscOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { selectedSiteUrl?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const matches = await listVerifiedProperties();
    if (matches.length === 0) {
      return { status: "no_property" as const, candidates: [] as string[] };
    }
    let siteUrl: string;
    if (data.selectedSiteUrl) {
      const hit = matches.find((m) => m.siteUrl === data.selectedSiteUrl);
      if (!hit) throw new Error("Propriété Search Console non vérifiée pour ce site.");
      siteUrl = hit.siteUrl;
    } else if (matches.length === 1) {
      siteUrl = matches[0].siteUrl;
    } else {
      return { status: "selection_required" as const, candidates: matches.map((m) => m.siteUrl) };
    }

    const sitemaps = (await gsc(
      `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
    )) as {
      sitemap?: Array<{
        path: string;
        lastSubmitted?: string;
        lastDownloaded?: string;
        isPending?: boolean;
        warnings?: string;
        errors?: string;
        contents?: Array<{ type?: string; submitted?: string; indexed?: string }>;
      }>;
    };

    return {
      status: "ok" as const,
      siteUrl,
      candidates: matches.map((m) => m.siteUrl),
      sitemaps: sitemaps.sitemap ?? [],
    };
  });

/** (Re)submit the sitemap to Search Console. */
export const gscSubmitSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string; sitemapUrl?: string }) => {
    if (!input?.siteUrl) throw new Error("siteUrl requis");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const matches = await listVerifiedProperties();
    if (!matches.some((m) => m.siteUrl === data.siteUrl)) {
      throw new Error("Propriété Search Console non vérifiée pour ce site.");
    }
    const sitemapUrl = data.sitemapUrl ?? `${SITE_URL}/sitemap.xml`;
    if (!sitemapUrl.startsWith(SITE_URL)) throw new Error("Sitemap hors du domaine du site.");
    await gsc(
      `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      { method: "PUT" },
    );
    return { ok: true, sitemapUrl };
  });

/** List the site URLs that should be indexed (same source as the sitemap). */
export const gscListSiteUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const urls: Array<{ url: string; kind: string; label: string }> = [
      { url: `${SITE_URL}/`, kind: "Page", label: "Accueil" },
      { url: `${SITE_URL}/articles`, kind: "Page", label: "Articles" },
      { url: `${SITE_URL}/videos`, kind: "Page", label: "Vidéos" },
      { url: `${SITE_URL}/interviews`, kind: "Page", label: "Interviews" },
      { url: `${SITE_URL}/collections`, kind: "Page", label: "Collections" },
      { url: `${SITE_URL}/a-propos`, kind: "Page", label: "À propos" },
    ];
    const { data: articles } = await supabaseAdmin
      .from("articles")
      .select("slug,title")
      .eq("published", true)
      .order("published_at", { ascending: false });
    for (const a of articles ?? []) {
      if (a.slug) urls.push({ url: `${SITE_URL}/articles/${a.slug}`, kind: "Article", label: a.title });
    }
    const { data: videos } = await supabaseAdmin
      .from("videos")
      .select("slug,title")
      .eq("published", true)
      .order("published_at", { ascending: false });
    for (const v of videos ?? []) {
      if (v.slug) urls.push({ url: `${SITE_URL}/videos/${v.slug}`, kind: "Vidéo", label: v.title });
    }
    return { urls };
  });

/** Inspect a batch of URLs (indexing status) against the selected property. */
export const gscInspectUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string; urls: string[] }) => {
    if (!input?.siteUrl) throw new Error("siteUrl requis");
    if (!Array.isArray(input.urls) || input.urls.length === 0) throw new Error("urls requis");
    if (input.urls.length > 10) throw new Error("10 URLs maximum par lot");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const matches = await listVerifiedProperties();
    if (!matches.some((m) => m.siteUrl === data.siteUrl)) {
      throw new Error("Propriété Search Console non vérifiée pour ce site.");
    }
    const results: Array<{
      url: string;
      verdict?: string;
      coverageState?: string;
      lastCrawlTime?: string;
      robotsTxtState?: string;
      error?: string;
    }> = [];

    for (const url of data.urls) {
      if (!url.startsWith(SITE_URL)) {
        results.push({ url, error: "URL hors du domaine du site" });
        continue;
      }
      try {
        const res = (await gsc("/v1/urlInspection/index:inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inspectionUrl: url, siteUrl: data.siteUrl }),
        })) as {
          inspectionResult?: {
            indexStatusResult?: {
              verdict?: string;
              coverageState?: string;
              lastCrawlTime?: string;
              robotsTxtState?: string;
            };
          };
        };
        const r = res.inspectionResult?.indexStatusResult ?? {};
        results.push({
          url,
          verdict: r.verdict,
          coverageState: r.coverageState,
          lastCrawlTime: r.lastCrawlTime,
          robotsTxtState: r.robotsTxtState,
        });
      } catch (e) {
        results.push({ url, error: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }
    return { results, checkedAt: new Date().toISOString() };
  });
