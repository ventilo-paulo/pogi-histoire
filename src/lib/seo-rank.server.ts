import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { gsc, resolveSiteUrl } from "@/lib/seo-check.server";

function isoDay(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/**
 * Pull the last `days` days of Search Console data grouped by date + query
 * and persist them so we can plot how positions evolve over time.
 */
export async function refreshQueryRanks(days = 28) {
  const siteUrl = await resolveSiteUrl();
  // Search Console data lags ~2 days.
  const startDate = isoDay(days + 2);
  const endDate = isoDay(2);

  const res = (await gsc(
    `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["date", "query"],
        rowLimit: 5000,
        dataState: "final",
      }),
    },
  )) as { rows?: Row[] };

  const rows = res.rows ?? [];
  const capturedAt = new Date().toISOString();
  const payload = rows.map((r) => ({
    date: r.keys[0],
    query: r.keys[1],
    clicks: Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
    captured_at: capturedAt,
  }));

  for (let i = 0; i < payload.length; i += 500) {
    const chunk = payload.slice(i, i + 500);
    const { error } = await supabaseAdmin
      .from("seo_query_ranks" as any)
      .upsert(chunk, { onConflict: "date,query" });
    if (error) throw new Error(error.message);
  }

  return { ok: true, siteUrl, startDate, endDate, rows: payload.length, capturedAt };
}

export type QuerySummary = {
  query: string;
  position: number;
  previousPosition: number | null;
  delta: number | null;
  clicks: number;
  impressions: number;
  ctr: number;
  history: Array<{ date: string; position: number; clicks: number; impressions: number }>;
};

/**
 * Aggregate stored rows into a per-query summary: current average position
 * (last 7 days) vs the 7 days before, so we can see who is climbing.
 */
export async function getQueryRankSummary(limit = 100) {
  const since = isoDay(32);
  const { data, error } = await supabaseAdmin
    .from("seo_query_ranks" as any)
    .select("date,query,clicks,impressions,ctr,position")
    .gte("date", since)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = ((data as any[]) ?? []) as Array<{
    date: string;
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  if (!rows.length) return { queries: [] as QuerySummary[], lastDate: null as string | null };

  const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
  const lastDate = dates[dates.length - 1];
  const recentDates = new Set(dates.slice(-7));
  const previousDates = new Set(dates.slice(-14, -7));

  const byQuery = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byQuery.get(r.query) ?? [];
    list.push(r);
    byQuery.set(r.query, list);
  }

  const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

  const queries: QuerySummary[] = [];
  for (const [query, list] of byQuery) {
    const recent = list.filter((r) => recentDates.has(r.date));
    const previous = list.filter((r) => previousDates.has(r.date));
    const position = avg(recent.map((r) => r.position)) ?? avg(list.map((r) => r.position)) ?? 0;
    const previousPosition = avg(previous.map((r) => r.position));
    queries.push({
      query,
      position,
      previousPosition,
      // Positive delta = the query climbed (lower position number).
      delta: previousPosition === null ? null : previousPosition - position,
      clicks: recent.reduce((a, r) => a + (r.clicks ?? 0), 0),
      impressions: recent.reduce((a, r) => a + (r.impressions ?? 0), 0),
      ctr: avg(recent.map((r) => r.ctr)) ?? 0,
      history: list.map((r) => ({
        date: r.date,
        position: r.position,
        clicks: r.clicks,
        impressions: r.impressions,
      })),
    });
  }

  queries.sort((a, b) => b.impressions - a.impressions || a.position - b.position);
  return { queries: queries.slice(0, limit), lastDate };
}
