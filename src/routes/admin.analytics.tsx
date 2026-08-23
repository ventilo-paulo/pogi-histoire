import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Eye, MousePointerClick, Search, SearchX, Users } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Audience — Admin POGI" }, { name: "robots", content: "noindex" }] }),
  component: AdminAnalytics,
});

type Row = {
  id: string;
  event: string;
  path: string | null;
  label: string | null;
  slug: string | null;
  session_id: string | null;
  referrer: string | null;
  created_at: string;
};

const RANGES = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
] as const;

function topOf(rows: Row[], key: (r: Row) => string | null, limit = 8) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function AdminAnalytics() {
  const [days, setDays] = useState<number>(30);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    (async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("id,event,path,label,slug,session_id,referrer,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000);
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const views = list.filter((r) => r.event === "page_view");
    const sessions = new Set(list.map((r) => r.session_id).filter(Boolean)).size;
    const searches = list.filter((r) => r.event === "search_query");
    const clicks = list.filter((r) => r.event.endsWith("_click"));
    const noResults = list.filter((r) => r.event === "search_no_results");
    const emptySearches = list.filter((r) => r.event === "search_empty");
    const resultClicks = list.filter((r) => r.event === "search_result_click");
    return {
      views: views.length,
      sessions,
      searches: searches.length,
      clicks: clicks.length,
      noResults: noResults.length,
      emptySearches: emptySearches.length,
      resultClicks: resultClicks.length,
      noResultsRate: searches.length ? Math.round((noResults.length / searches.length) * 100) : 0,
      searchCtr: searches.length ? Math.round((resultClicks.length / searches.length) * 100) : 0,
      topPages: topOf(views, (r) => r.path),
      topArticles: topOf(list.filter((r) => r.event === "article_click"), (r) => r.label),
      topVideos: topOf(list.filter((r) => r.event === "video_click" || r.event === "outbound_click"), (r) => r.label),
      topSearches: topOf(searches, (r) => r.label),
      topNoResults: topOf(noResults, (r) => r.label),
      topSearchClicks: topOf(resultClicks, (r) => r.label),
      topNav: topOf(list.filter((r) => r.event === "nav_click"), (r) => r.label),
      topReferrers: topOf(list, (r) => r.referrer),
      perDay: (() => {
        const m = new Map<string, number>();
        for (const v of views) {
          const d = v.created_at.slice(0, 10);
          m.set(d, (m.get(d) ?? 0) + 1);
        }
        return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      })(),
    };
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase text-white">Audience</h1>
          <p className="text-white/60 text-sm mt-1">Pages vues, clics articles/vidéos, recherches et navigation.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                days === r.days ? "bg-pogi-yellow text-pogi-dark" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {rows === null && !error && <p className="text-white/50">Chargement des statistiques…</p>}

      {rows && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={<Eye size={18} />} label="Pages vues" value={stats.views} />
            <Kpi icon={<Users size={18} />} label="Sessions" value={stats.sessions} />
            <Kpi icon={<MousePointerClick size={18} />} label="Clics contenus" value={stats.clicks} />
            <Kpi icon={<Search size={18} />} label="Recherches" value={stats.searches} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={<SearchX size={18} />} label="Sans résultat" value={stats.noResults} />
            <Kpi icon={<SearchX size={18} />} label="% sans résultat" value={stats.noResultsRate} suffix="%" />
            <Kpi icon={<Search size={18} />} label="Recherches vides / abandons" value={stats.emptySearches} />
            <Kpi icon={<MousePointerClick size={18} />} label="Clics résultats (CTR)" value={stats.resultClicks} suffix={` · ${stats.searchCtr}%`} />
          </div>

          <Panel title="Pages vues par jour" icon={<BarChart3 size={16} />}>
            {stats.perDay.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex items-end gap-1 h-32">
                {stats.perDay.map(([d, n]) => {
                  const max = Math.max(...stats.perDay.map((x) => x[1]));
                  return (
                    <div key={d} className="flex-1 min-w-[4px] group relative">
                      <div
                        className="w-full bg-pogi-yellow/70 group-hover:bg-pogi-yellow rounded-t"
                        style={{ height: `${Math.max(4, (n / max) * 128)}px` }}
                        title={`${d} — ${n} vues`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="grid md:grid-cols-2 gap-6">
            <TopList title="Articles les plus cliqués" data={stats.topArticles} />
            <TopList title="Vidéos les plus cliquées" data={stats.topVideos} />
            <TopList title="Pages les plus vues" data={stats.topPages} />
            <TopList title="Recherches les plus fréquentes" data={stats.topSearches} />
            <TopList title="Recherches sans résultat" data={stats.topNoResults} />
            <TopList title="Résultats les plus cliqués" data={stats.topSearchClicks} />
            <TopList title="Navigation (menu)" data={stats.topNav} />
            <TopList title="Sites référents" data={stats.topReferrers} />
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-3xl text-pogi-yellow">
        {value.toLocaleString("fr-FR")}
        {suffix && <span className="text-xl">{suffix}</span>}
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="flex items-center gap-2 text-white font-semibold mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function TopList({ title, data }: { title: string; data: [string, number][] }) {
  const max = data.length ? data[0][1] : 1;
  return (
    <Panel title={title}>
      {data.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2">
          {data.map(([k, n]) => (
            <li key={k} className="relative">
              <div className="flex items-center justify-between gap-4 text-sm relative z-10 px-2 py-1.5">
                <span className="truncate text-white/85">{k}</span>
                <span className="text-pogi-yellow font-semibold shrink-0">{n}</span>
              </div>
              <div
                className="absolute inset-y-0 left-0 rounded bg-pogi-yellow/10"
                style={{ width: `${(n / max) * 100}%` }}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Empty() {
  return <p className="text-white/40 text-sm">Aucune donnée sur cette période.</p>;
}
