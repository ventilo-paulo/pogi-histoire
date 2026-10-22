/** Pure helpers to turn Google Search Console rows into clear indicators. */

export type SearchRow = { clicks: number; impressions: number; position: number };
export type DailyRow = SearchRow & { date: string };

export type PeriodTotals = {
  clicks: number;
  impressions: number;
  /** clicks / impressions, between 0 and 1. */
  ctr: number;
  /** Average position weighted by impressions; null when no impressions. */
  position: number | null;
};

export function totalsFor(rows: SearchRow[]): PeriodTotals {
  let clicks = 0;
  let impressions = 0;
  let weighted = 0;
  for (const r of rows) {
    clicks += r.clicks ?? 0;
    impressions += r.impressions ?? 0;
    weighted += (r.position ?? 0) * (r.impressions ?? 0);
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weighted / impressions : null,
  };
}

/** ISO date (YYYY-MM-DD) shifted by `days`. */
export function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Compare the `days` days ending on `endDate` (inclusive) with the `days`
 * days just before.
 */
export function comparePeriods(rows: DailyRow[], endDate: string, days = 28) {
  const currentStart = shiftDay(endDate, -(days - 1));
  const previousEnd = shiftDay(currentStart, -1);
  const previousStart = shiftDay(previousEnd, -(days - 1));
  const current = rows.filter((r) => r.date >= currentStart && r.date <= endDate);
  const previous = rows.filter((r) => r.date >= previousStart && r.date <= previousEnd);
  return {
    current: totalsFor(current),
    previous: totalsFor(previous),
    // Only compare when most of the previous period is known.
    hasPrevious: previous.length >= Math.ceil(days * 0.75),
    range: { currentStart, endDate, previousStart, previousEnd },
  };
}

export type KeyedStat = PeriodTotals & { key: string };

/** Group rows by key (query, page…), sorted by clicks then impressions. */
export function aggregateByKey(rows: Array<SearchRow & { key: string }>): KeyedStat[] {
  const groups = new Map<string, SearchRow[]>();
  for (const r of rows) {
    const list = groups.get(r.key) ?? [];
    list.push(r);
    groups.set(r.key, list);
  }
  return Array.from(groups, ([key, list]) => ({ key, ...totalsFor(list) })).sort(
    (a, b) => b.clicks - a.clicks || b.impressions - a.impressions,
  );
}

/** Percentage change, null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
