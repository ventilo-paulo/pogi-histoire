import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  getSearchAlertSettings,
  saveSearchAlertSettings,
  runSearchAlertCheckNow,
} from "@/lib/search-alerts.functions";
import { BarChart3, BellRing, Download, Eye, MousePointerClick, Search, SearchX, Users } from "lucide-react";

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
  meta: Record<string, unknown> | null;
};

const SEARCH_EVENTS = ["search_empty", "search_no_results", "search_result_click"];

const metaStr = (r: Row, key: string) => {
  const v = r.meta?.[key];
  return v === null || v === undefined || v === "" ? null : String(v);
};

const KIND_LABEL: Record<string, string> = {
  article: "Articles",
  collection: "Collections",
  video: "Vidéos",
  interview: "Interviews",
};

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportSearchCsv(rows: Row[], days: number) {
  const list = rows.filter((r) => SEARCH_EVENTS.includes(r.event));
  const head = [
    "Date",
    "Événement",
    "Requête",
    "Page",
    "Type",
    "Catégorie",
    "Source",
    "Position",
    "Résultats",
    "Slug",
    "Session",
    "Référent",
  ];
  const body = list.map((r) => [
    new Date(r.created_at).toISOString(),
    r.event,
    r.label ?? "",
    r.path ?? "",
    metaStr(r, "kind") ?? "",
    metaStr(r, "category") ?? "",
    metaStr(r, "source") ?? "",
    metaStr(r, "position") ?? "",
    metaStr(r, "results") ?? "",
    r.slug ?? "",
    r.session_id ?? "",
    r.referrer ?? "",
  ]);
  const csv = "\uFEFF" + [head, ...body].map((r) => r.map(csvEscape).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pogi-recherches_${days}j_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
        .select("id,event,path,label,slug,session_id,referrer,created_at,meta")
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
      noResultsByCategory: topOf(noResults, (r) => metaStr(r, "category")),
      clicksByCategory: topOf(resultClicks, (r) => metaStr(r, "category")),
      clicksByKind: topOf(resultClicks, (r) => {
        const k = metaStr(r, "kind");
        return k ? (KIND_LABEL[k] ?? k) : null;
      }),
      clicksArticles: topOf(resultClicks.filter((r) => metaStr(r, "kind") === "article"), (r) => r.label),
      clicksCollections: topOf(resultClicks.filter((r) => metaStr(r, "kind") === "collection"), (r) => r.label),
      clicksVideos: topOf(resultClicks.filter((r) => metaStr(r, "kind") === "video"), (r) => r.label),
      noResultsDetailed: topOf(noResults, (r) => {
        const cat = metaStr(r, "category");
        return r.label ? `${r.label}${cat ? ` · ${cat}` : ""}` : null;
      }),
      searchEventCount: list.filter((r) => SEARCH_EVENTS.includes(r.event)).length,
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
          <button
            onClick={() => rows && exportSearchCsv(rows, days)}
            disabled={!rows}
            className="px-3 py-1.5 rounded-md text-sm font-semibold bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 flex items-center gap-2"
          >
            <Download size={15} />
            Export CSV recherches{rows ? ` (${stats.searchEventCount})` : ""}
          </button>
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

          <h2 className="font-display text-2xl uppercase text-white pt-2">Recherche — détail par catégorie et par type</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <TopList title="Requêtes sans résultat (avec catégorie)" data={stats.noResultsDetailed} />
            <TopList title="Sans résultat par catégorie" data={stats.noResultsByCategory} />
            <TopList title="Clics résultats par type" data={stats.clicksByKind} />
            <TopList title="Clics résultats par catégorie" data={stats.clicksByCategory} />
            <TopList title="Résultats cliqués — articles" data={stats.clicksArticles} />
            <TopList title="Résultats cliqués — collections" data={stats.clicksCollections} />
            <TopList title="Résultats cliqués — vidéos" data={stats.clicksVideos} />
          </div>

          <AlertSettings />
        </>
      )}
    </div>
  );
}

function AlertSettings() {
  const load = useServerFn(getSearchAlertSettings);
  const save = useServerFn(saveSearchAlertSettings);
  const runNow = useServerFn(runSearchAlertCheckNow);

  const [form, setForm] = useState<{
    enabled: boolean;
    window_days: number;
    min_searches: number;
    no_results_threshold_pct: number;
    empty_threshold_pct: number;
    email_enabled: boolean;
    notify_email: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastAlertAt, setLastAlertAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s: any = await load();
        if (cancelled) return;
        setForm({
          enabled: !!s.enabled,
          window_days: s.window_days ?? 7,
          min_searches: s.min_searches ?? 20,
          no_results_threshold_pct: s.no_results_threshold_pct ?? 25,
          empty_threshold_pct: s.empty_threshold_pct ?? 50,
          email_enabled: !!s.email_enabled,
          notify_email: s.notify_email ?? "",
        });
        setLastAlertAt(s.last_alert_at ?? null);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Chargement impossible");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (err && !form) return <Panel title="Alertes recherche" icon={<BellRing size={16} />}><p className="text-red-400 text-sm">{err}</p></Panel>;
  if (!form) return <Panel title="Alertes recherche" icon={<BellRing size={16} />}><p className="text-white/50 text-sm">Chargement…</p></Panel>;

  const num = (k: keyof typeof form) => ({
    type: "number" as const,
    value: form[k] as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) }),
    className:
      "w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-pogi-yellow/60",
  });

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await save({ data: { ...form, notify_email: form.notify_email || null } });
      setMsg("Seuils enregistrés.");
    } catch (e: any) {
      setErr(e?.message ?? "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r: any = await runNow();
      setMsg(
        r?.alerts?.length
          ? `Seuil dépassé : ${r.alerts.join(" · ")} — alerte enregistrée${form.email_enabled && form.notify_email ? " et e-mail envoyé" : ""}.`
          : `Aucun seuil dépassé — ${r?.searches ?? 0} recherche(s), ${r?.no_results_pct ?? 0}% sans résultat, ${r?.empty_pct ?? 0}% vides sur ${r?.window_days ?? form.window_days} jours.`,
      );
      if (r?.alerts?.length) setLastAlertAt(new Date().toISOString());
    } catch (e: any) {
      setErr(e?.message ?? "Vérification impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Alertes recherche (seuils configurables)" icon={<BellRing size={16} />}>
      <p className="text-white/60 text-sm mb-4">
        Une alerte est enregistrée (et envoyée par e-mail) dès que le taux de recherches sans résultat ou de recherches
        vides/abandonnées dépasse le seuil, avec un résumé des requêtes concernées. Vérification automatique quotidienne.
        {lastAlertAt && ` Dernière alerte : ${new Date(lastAlertAt).toLocaleString("fr-FR")}.`}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="text-sm text-white/70 space-y-1 block">
          <span>Fenêtre (jours)</span>
          <input {...num("window_days")} min={1} max={90} />
        </label>
        <label className="text-sm text-white/70 space-y-1 block">
          <span>Recherches minimum</span>
          <input {...num("min_searches")} min={1} />
        </label>
        <label className="text-sm text-white/70 space-y-1 block">
          <span>Seuil % sans résultat</span>
          <input {...num("no_results_threshold_pct")} min={1} max={100} />
        </label>
        <label className="text-sm text-white/70 space-y-1 block">
          <span>Seuil % recherches vides</span>
          <input {...num("empty_threshold_pct")} min={1} max={100} />
        </label>
        <label className="text-sm text-white/70 space-y-1 block sm:col-span-2">
          <span>E-mail de notification</span>
          <input
            type="email"
            value={form.notify_email}
            onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
            placeholder="pogi.videos@gmail.com"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-pogi-yellow/60"
          />
        </label>
        <div className="flex flex-col gap-2 justify-end text-sm text-white/80">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Alertes activées
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.email_enabled}
              onChange={(e) => setForm({ ...form, email_enabled: e.target.checked })}
            />
            Envoyer un e-mail
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-pogi-yellow text-pogi-dark font-semibold text-sm disabled:opacity-50"
        >
          Enregistrer les seuils
        </button>
        <button
          onClick={check}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-white/5 text-white/80 hover:bg-white/10 text-sm disabled:opacity-50"
        >
          Vérifier maintenant
        </button>
        {msg && <span className="text-emerald-400 text-sm">{msg}</span>}
        {err && <span className="text-red-400 text-sm">{err}</span>}
      </div>
    </Panel>
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
