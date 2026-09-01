import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
export const SITE_URL = "https://pogi-histoire.com";

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

export async function gsc(path: string, init?: RequestInit) {
  const response = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...gatewayHeaders(), ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`GSC request failed [${response.status}] ${path}: ${body}`);
    throw new Error(`Search Console a répondu ${response.status}: ${body.slice(0, 300)}`);
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

export async function resolveSiteUrl() {
  const { siteEntry = [] } = (await gsc("/webmasters/v3/sites")) as { siteEntry?: SiteEntry[] };
  const target = new URL(SITE_URL);
  const matches = siteEntry.filter(
    (e) => e.permissionLevel !== "siteUnverifiedUser" && coversTarget(e.siteUrl, target),
  );
  if (matches.length === 0) throw new Error("Aucune propriété Search Console vérifiée pour ce site.");
  return matches[0].siteUrl;
}

export async function listSiteUrls() {
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
  return urls;
}

type Verdict = "indexed" | "pending" | "missing" | "error";

function classify(r: { verdict?: string; error?: string }): Verdict {
  if (r.error) return "error";
  if (r.verdict === "PASS") return "indexed";
  if (r.verdict === "NEUTRAL" || r.verdict === "PARTIAL") return "pending";
  return "missing";
}

async function inspectUrl(siteUrl: string, url: string) {
  const res = (await gsc("/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl }),
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
  return res.inspectionResult?.indexStatusResult ?? {};
}

/**
 * Full automated check: sitemap status + URL indexing status.
 * Persists results and raises alerts for new errors / non-indexed URLs.
 */
export async function runSeoIndexCheck(trigger: "cron" | "manual" = "cron") {
  const { data: run } = await supabaseAdmin
    .from("seo_index_runs" as any)
    .insert({ trigger })
    .select("id")
    .single();
  const runId = (run as any)?.id as string | undefined;

  const alerts: Array<{
    level: string;
    kind: string;
    target?: string | null;
    title: string;
    detail?: string | null;
  }> = [];

  try {
    const siteUrl = await resolveSiteUrl();

    // --- Sitemap ---
    const sitemapsRes = (await gsc(
      `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
    )) as { sitemap?: Array<any> };
    const sitemaps = sitemapsRes.sitemap ?? [];
    let sitemapErrors = 0;
    let sitemapWarnings = 0;
    let sitemapStatus = sitemaps.length ? "ok" : "missing";
    if (!sitemaps.length) {
      alerts.push({
        level: "error",
        kind: "sitemap",
        target: `${SITE_URL}/sitemap.xml`,
        title: "Aucun sitemap déclaré dans Search Console",
        detail: "Resoumettez le sitemap depuis Admin > Indexation.",
      });
    }
    for (const s of sitemaps) {
      const errs = Number(s.errors ?? 0);
      const warns = Number(s.warnings ?? 0);
      sitemapErrors += errs;
      sitemapWarnings += warns;
      if (errs > 0) {
        sitemapStatus = "error";
        alerts.push({
          level: "error",
          kind: "sitemap",
          target: s.path,
          title: `Sitemap en erreur (${errs})`,
          detail: `${s.path} — ${errs} erreur(s), ${warns} avertissement(s).`,
        });
      } else if (warns > 0 && sitemapStatus !== "error") {
        sitemapStatus = "warning";
        alerts.push({
          level: "warning",
          kind: "sitemap",
          target: s.path,
          title: `Sitemap : ${warns} avertissement(s)`,
          detail: s.path,
        });
      }
    }

    // --- URLs ---
    const urls = await listSiteUrls();
    const { data: previousRows } = await supabaseAdmin
      .from("seo_url_status" as any)
      .select("url,verdict,error");
    const previous = new Map<string, Verdict>();
    for (const p of (previousRows as any[]) ?? []) {
      previous.set(p.url, classify({ verdict: p.verdict, error: p.error }));
    }

    const counts = { indexed: 0, pending: 0, missing: 0, error: 0 };
    const rows: any[] = [];
    const checkedAt = new Date().toISOString();

    for (const u of urls) {
      let result: { verdict?: string; coverageState?: string; lastCrawlTime?: string; robotsTxtState?: string } = {};
      let error: string | null = null;
      try {
        result = await inspectUrl(siteUrl, u.url);
      } catch (e) {
        error = e instanceof Error ? e.message : "Erreur inconnue";
      }
      const state = classify({ verdict: result.verdict, error: error ?? undefined });
      counts[state]++;
      rows.push({
        url: u.url,
        kind: u.kind,
        label: u.label,
        verdict: result.verdict ?? null,
        coverage_state: result.coverageState ?? null,
        robots_state: result.robotsTxtState ?? null,
        last_crawl_time: result.lastCrawlTime ?? null,
        error,
        checked_at: checkedAt,
        updated_at: checkedAt,
      });

      const before = previous.get(u.url);
      const isBad = state === "error" || state === "missing";
      if (isBad && before !== state) {
        alerts.push({
          level: state === "error" ? "error" : "warning",
          kind: "url",
          target: u.url,
          title:
            state === "error"
              ? `Erreur de vérification : ${u.label}`
              : `Page non indexée : ${u.label}`,
          detail: error ?? result.coverageState ?? "Statut Google : non indexée.",
        });
      }
    }

    if (rows.length) {
      await supabaseAdmin.from("seo_url_status" as any).upsert(rows, { onConflict: "url" });
    }

    if (runId) {
      await supabaseAdmin
        .from("seo_index_runs" as any)
        .update({
          finished_at: new Date().toISOString(),
          ok: true,
          sitemap_status: sitemapStatus,
          sitemap_errors: sitemapErrors,
          sitemap_warnings: sitemapWarnings,
          urls_total: urls.length,
          urls_indexed: counts.indexed,
          urls_pending: counts.pending,
          urls_missing: counts.missing,
          urls_error: counts.error,
          message: `${counts.indexed} indexées / ${urls.length}`,
        })
        .eq("id", runId);
    }

    // Keep the per-query position history fresh (never fatal for the run).
    try {
      const { refreshQueryRanks } = await import("@/lib/seo-rank.server");
      await refreshQueryRanks(28);
    } catch (e) {
      console.error("refreshQueryRanks failed", e);
    }

    if (alerts.length) {
      await supabaseAdmin
        .from("seo_alerts" as any)
        .insert(alerts.map((a) => ({ ...a, run_id: runId ?? null })));
    }

    return {
      ok: true,
      runId,
      sitemapStatus,
      sitemapErrors,
      sitemapWarnings,
      counts,
      total: urls.length,
      alerts: alerts.length,
      checkedAt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    if (runId) {
      await supabaseAdmin
        .from("seo_index_runs" as any)
        .update({ finished_at: new Date().toISOString(), ok: false, message })
        .eq("id", runId);
    }
    await supabaseAdmin.from("seo_alerts" as any).insert({
      level: "error",
      kind: "run",
      title: "Échec de la vérification automatique d'indexation",
      detail: message,
      run_id: runId ?? null,
    });
    return { ok: false, runId, error: message };
  }
}
