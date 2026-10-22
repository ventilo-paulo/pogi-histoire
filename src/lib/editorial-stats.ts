/** Pure helpers summarising site audience for the editorial assistant. */

export type AudienceEvent = {
  event: string;
  path: string | null;
  label: string | null;
  slug: string | null;
  referrer: string | null;
};

export type Counted = { key: string; count: number };

function top(map: Map<string, number>, limit: number): Counted[] {
  return Array.from(map, ([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function bump(map: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function normalizeQuery(q: string): string {
  return q.toLocaleLowerCase("fr-FR").replace(/\s+/g, " ").trim();
}

/** Content page = /articles/<slug> or /videos/<slug> (not the list pages). */
export function contentSlug(path: string | null): { kind: "article" | "video"; slug: string } | null {
  if (!path) return null;
  const m = path.match(/^\/(articles|videos)\/([^/?#]+)\/?$/);
  if (!m) return null;
  return { kind: m[1] === "articles" ? "article" : "video", slug: decodeURIComponent(m[2]) };
}

export function summarizeAudience(events: AudienceEvent[]) {
  const views = new Map<string, number>();
  const contentViews = new Map<string, number>();
  const searches = new Map<string, number>();
  const noResults = new Map<string, number>();
  const shares = new Map<string, number>();
  const referrers = new Map<string, number>();
  let pageViews = 0;

  for (const e of events) {
    if (e.event === "page_view") {
      pageViews++;
      bump(views, e.path);
      const c = contentSlug(e.path);
      if (c) bump(contentViews, `${c.kind}:${c.slug}`);
      if (e.referrer) bump(referrers, e.referrer);
    } else if (e.event === "search_query" && e.label) {
      bump(searches, normalizeQuery(e.label));
    } else if ((e.event === "search_no_results" || e.event === "search_empty") && e.label) {
      bump(noResults, normalizeQuery(e.label));
    } else if (e.event === "share_click") {
      bump(shares, e.slug);
    }
  }

  return {
    pageViews,
    topPages: top(views, 15),
    contentViews: top(contentViews, 50),
    siteSearches: top(searches, 20),
    searchesWithoutResult: top(noResults, 15),
    shares: top(shares, 10),
    referrers: top(referrers, 10),
  };
}

export type AudienceSummary = ReturnType<typeof summarizeAudience>;
