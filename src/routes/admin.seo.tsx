import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  gscOverview,
  gscSubmitSitemap,
  gscListSiteUrls,
  gscInspectUrls,
} from "@/lib/gsc.functions";
import {
  seoMonitorState,
  seoRunCheckNow,
  seoMarkAlertsRead,
} from "@/lib/seo-monitor.functions";
import { SeoQueryRanks } from "@/components/admin/SeoQueryRanks";
import { RefreshCw, Upload, CheckCircle2, AlertTriangle, XCircle, Clock, Search, Bell, BellOff, Play, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/admin/seo")({
  head: () => ({ meta: [{ title: "Indexation — Admin POGI", name: "robots", content: "noindex" }] }),
  component: AdminSeo,
});

type Sitemap = {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  warnings?: string;
  errors?: string;
  contents?: Array<{ type?: string; submitted?: string; indexed?: string }>;
};

type UrlItem = { url: string; kind: string; label: string };
type InspectResult = {
  url: string;
  verdict?: string;
  coverageState?: string;
  lastCrawlTime?: string;
  robotsTxtState?: string;
  error?: string;
};

const STORAGE_KEY = "pogi.gsc.inspection";

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

function VerdictBadge({ r }: { r: InspectResult }) {
  if (r.error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-300 text-xs">
        <XCircle size={14} /> Erreur
      </span>
    );
  }
  if (r.verdict === "PASS") {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs">
        <CheckCircle2 size={14} /> Indexée
      </span>
    );
  }
  if (r.verdict === "NEUTRAL" || r.verdict === "PARTIAL") {
    return (
      <span className="inline-flex items-center gap-1.5 text-pogi-yellow text-xs">
        <Clock size={14} /> En attente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-orange-300 text-xs">
      <AlertTriangle size={14} /> Non indexée
    </span>
  );
}

function AdminSeo() {
  const overview = useServerFn(gscOverview);
  const submitSitemap = useServerFn(gscSubmitSitemap);
  const listUrls = useServerFn(gscListSiteUrls);
  const inspect = useServerFn(gscInspectUrls);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [results, setResults] = useState<Record<string, InspectResult>>({});
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const monitorState = useServerFn(seoMonitorState);
  const runCheckNow = useServerFn(seoRunCheckNow);
  const markRead = useServerFn(seoMarkAlertsRead);
  const [runs, setRuns] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { results: Record<string, InspectResult>; checkedAt: string };
        setResults(parsed.results ?? {});
        setCheckedAt(parsed.checkedAt ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function loadMonitor() {
    try {
      const state = (await monitorState()) as any;
      setRuns(state.runs ?? []);
      setAlerts(state.alerts ?? []);
      const fromDb: Record<string, InspectResult> = {};
      let latest: string | null = null;
      for (const s of state.statuses ?? []) {
        fromDb[s.url] = {
          url: s.url,
          verdict: s.verdict ?? undefined,
          coverageState: s.coverage_state ?? undefined,
          lastCrawlTime: s.last_crawl_time ?? undefined,
          robotsTxtState: s.robots_state ?? undefined,
          error: s.error ?? undefined,
        };
        if (!latest || (s.checked_at && s.checked_at > latest)) latest = s.checked_at;
      }
      if (Object.keys(fromDb).length) {
        setResults((prev) => ({ ...prev, ...fromDb }));
        if (latest) setCheckedAt((prev) => (!prev || latest! > prev ? latest! : prev));
      }
    } catch {
      /* monitoring optional */
    }
  }

  async function load(selected?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = (await overview({ data: selected ? { selectedSiteUrl: selected } : {} })) as any;
      setCandidates(res.candidates ?? []);
      if (res.status === "ok") {
        setSiteUrl(res.siteUrl);
        setSitemaps(res.sitemaps ?? []);
      } else if (res.status === "selection_required") {
        setSiteUrl(null);
      } else {
        setSiteUrl(null);
        setError("Aucune propriété Search Console vérifiée pour ce site.");
      }
      const list = (await listUrls()) as any;
      setUrls(list.urls ?? []);
      await loadMonitor();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function onRunCheckNow() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = (await runCheckNow()) as any;
      if (res.ok) {
        setNotice(
          `Vérification automatique terminée : ${res.counts.indexed} indexées, ${res.counts.pending} en attente, ${res.counts.missing + res.counts.error} en anomalie${res.alerts ? ` · ${res.alerts} alerte(s)` : ""}.`,
        );
      } else {
        setError(res.error ?? "Échec de la vérification.");
      }
      await load(siteUrl ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkRead(id?: string) {
    try {
      await markRead({ data: id ? { id } : {} });
      await loadMonitor();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function onSubmitSitemap() {
    if (!siteUrl) return;
    setBusy(true);
    setNotice(null);
    try {
      await submitSitemap({ data: { siteUrl } });
      setNotice("Sitemap soumis à Search Console.");
      await load(siteUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  async function onRefreshSitemap() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = (await refreshSitemap()) as any;
      setSitemapInfo(r);
      setNotice(
        `Sitemap régénéré : ${r.total} URLs (${r.articles} articles, ${r.videos} vidéos, ${r.pages} pages).` +
          (r.submitted ? " Envoyé à Search Console." : ` Envoi à Search Console impossible : ${r.submitError ?? "inconnu"}`),
      );
      await load(siteUrl ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  async function runInspection() {
    if (!siteUrl || urls.length === 0) return;
    setBusy(true);
    setNotice(null);
    const all = urls.map((u) => u.url);
    const next: Record<string, InspectResult> = { ...results };
    setProgress({ done: 0, total: all.length });
    try {
      for (let i = 0; i < all.length; i += 10) {
        const chunk = all.slice(i, i + 10);
        const res = (await inspect({ data: { siteUrl, urls: chunk } })) as any;
        for (const r of res.results as InspectResult[]) next[r.url] = r;
        setResults({ ...next });
        setProgress({ done: Math.min(i + 10, all.length), total: all.length });
      }
      const at = new Date().toISOString();
      setCheckedAt(at);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: next, checkedAt: at }));
      setNotice("Vérification des URLs terminée.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const stats = useMemo(() => {
    let indexed = 0;
    let pending = 0;
    let missing = 0;
    let errors = 0;
    for (const u of urls) {
      const r = results[u.url];
      if (!r) continue;
      if (r.error) errors++;
      else if (r.verdict === "PASS") indexed++;
      else if (r.verdict === "NEUTRAL" || r.verdict === "PARTIAL") pending++;
      else missing++;
    }
    const checked = indexed + pending + missing + errors;
    return { indexed, pending, missing, errors, checked, total: urls.length };
  }, [urls, results]);

  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.read_at), [alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return urls;
    return urls.filter((u) => u.label.toLowerCase().includes(q) || u.url.toLowerCase().includes(q));
  }, [urls, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display uppercase text-3xl text-white">Indexation & Search Console</h1>
          <p className="text-white/60 text-sm mt-1">
            Suivi du sitemap et de l'état d'indexation des pages du site.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load(siteUrl ?? undefined)}
            disabled={busy || loading}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={16} /> Actualiser
          </button>
          <button
            onClick={onRunCheckNow}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <Play size={16} /> Lancer la vérification
          </button>
          <button
            onClick={onSubmitSitemap}
            disabled={busy || !siteUrl}
            className="inline-flex items-center gap-2 rounded-md bg-pogi-yellow px-4 py-2 text-sm font-bold uppercase text-pogi-dark disabled:opacity-50"
          >
            <Upload size={16} /> Soumettre le sitemap
          </button>

        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}
      {notice && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-white/60">Chargement…</p>
      ) : (
        <>
          {!siteUrl && candidates.length > 1 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-white/80 mb-3">Plusieurs propriétés Search Console couvrent ce site. Choisissez :</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((c) => (
                  <button
                    key={c}
                    onClick={() => load(c)}
                    className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {siteUrl && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-wider text-white/50">Propriété</p>
                <p className="text-white font-semibold break-all">{siteUrl}</p>
              </div>

              <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-display uppercase text-xl text-white flex items-center gap-2">
                    <Bell size={18} /> Alertes
                    {unreadAlerts.length > 0 && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-200">
                        {unreadAlerts.length}
                      </span>
                    )}
                  </h2>
                  {unreadAlerts.length > 0 && (
                    <button
                      onClick={() => onMarkRead()}
                      className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                    >
                      <BellOff size={14} /> Tout marquer comme lu
                    </button>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <p className="text-white/60 text-sm">
                    Aucune alerte. Vous serez notifié ici dès qu'un sitemap tombe en erreur ou qu'une page passe en
                    « non indexée ».
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.slice(0, 20).map((a) => (
                      <li
                        key={a.id}
                        className={`rounded-lg border px-4 py-3 text-sm ${
                          a.read_at
                            ? "border-white/10 bg-white/5 text-white/50"
                            : a.level === "error"
                              ? "border-red-500/40 bg-red-500/10 text-red-100"
                              : "border-pogi-yellow/40 bg-pogi-yellow/10 text-pogi-yellow"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold flex items-center gap-2">
                              {a.level === "error" ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                              {a.title}
                            </p>
                            {a.detail && <p className="opacity-80 mt-0.5 break-all">{a.detail}</p>}
                            {a.target && <p className="opacity-60 text-xs mt-0.5 break-all">{a.target}</p>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs opacity-70">{fmt(a.created_at)}</span>
                            {!a.read_at && (
                              <button
                                onClick={() => onMarkRead(a.id)}
                                className="text-xs underline opacity-80 hover:opacity-100"
                              >
                                Lu
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="font-display uppercase text-xl text-white mb-3 flex items-center gap-2">
                  <CalendarClock size={18} /> Vérification automatique
                </h2>
                <p className="text-white/60 text-sm mb-4">
                  Un contrôle complet du sitemap et de toutes les URLs publiées est exécuté automatiquement chaque
                  jour à 5h00. Les anomalies génèrent une alerte ci-dessus.
                </p>
                {runs.length === 0 ? (
                  <p className="text-white/50 text-sm">Aucune exécution enregistrée pour le moment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="text-white/50 text-xs uppercase">
                        <tr>
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Déclencheur</th>
                          <th className="text-left py-2">Sitemap</th>
                          <th className="text-left py-2">Indexées</th>
                          <th className="text-left py-2">En attente</th>
                          <th className="text-left py-2">Anomalies</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map((r) => (
                          <tr key={r.id} className="border-t border-white/10">
                            <td className="py-2 pr-4 text-white/80">{fmt(r.started_at)}</td>
                            <td className="py-2 pr-4 text-white/60">
                              {r.trigger === "cron" ? "Automatique" : "Manuelle"}
                            </td>
                            <td className="py-2 pr-4">
                              {!r.ok ? (
                                <span className="text-red-300">Échec</span>
                              ) : r.sitemap_status === "error" ? (
                                <span className="text-red-300">Erreur</span>
                              ) : r.sitemap_status === "warning" ? (
                                <span className="text-pogi-yellow">Avertissement</span>
                              ) : (
                                <span className="text-emerald-300">OK</span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-emerald-300">{r.urls_indexed}</td>
                            <td className="py-2 pr-4 text-pogi-yellow">{r.urls_pending}</td>
                            <td className="py-2 text-orange-300">{r.urls_missing + r.urls_error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>



              <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="font-display uppercase text-xl text-white mb-4">Sitemaps</h2>
                {sitemaps.length === 0 ? (
                  <p className="text-white/60 text-sm">
                    Aucun sitemap soumis. Utilisez « Soumettre le sitemap ».
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="text-white/50 text-xs uppercase">
                        <tr>
                          <th className="text-left py-2">Sitemap</th>
                          <th className="text-left py-2">Soumis le</th>
                          <th className="text-left py-2">Lu par Google</th>
                          <th className="text-left py-2">État</th>
                          <th className="text-left py-2">Avert. / Err.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sitemaps.map((s) => (
                          <tr key={s.path} className="border-t border-white/10">
                            <td className="py-2 pr-4 break-all text-white/90">{s.path}</td>
                            <td className="py-2 pr-4 text-white/70">{fmt(s.lastSubmitted)}</td>
                            <td className="py-2 pr-4 text-white/70">{fmt(s.lastDownloaded)}</td>
                            <td className="py-2 pr-4">
                              {s.isPending ? (
                                <span className="text-pogi-yellow">En traitement</span>
                              ) : (
                                <span className="text-emerald-300">Traité</span>
                              )}
                            </td>
                            <td className="py-2 text-white/70">
                              {s.warnings ?? "0"} / {s.errors ?? "0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-display uppercase text-xl text-white">Progression d'indexation</h2>
                  <button
                    onClick={runInspection}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={progress ? "animate-spin" : ""} />
                    {progress ? `Vérification ${progress.done}/${progress.total}…` : "Vérifier les URLs"}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                  <Stat label="URLs suivies" value={stats.total} />
                  <Stat label="Vérifiées" value={stats.checked} />
                  <Stat label="Indexées" value={stats.indexed} tone="ok" />
                  <Stat label="En attente" value={stats.pending} tone="warn" />
                  <Stat label="Non indexées" value={stats.missing + stats.errors} tone="bad" />
                </div>

                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mb-2">
                  <div
                    className="h-full bg-pogi-yellow transition-all"
                    style={{ width: `${stats.total ? (stats.indexed / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-white/50 text-xs mb-5">
                  Dernière vérification : {fmt(checkedAt)} · Relancez la vérification chaque semaine pour suivre la progression.
                </p>

                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtrer les URLs…"
                    className="w-full rounded-md border border-white/15 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="text-white/50 text-xs uppercase">
                      <tr>
                        <th className="text-left py-2">Page</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Statut</th>
                        <th className="text-left py-2">Couverture</th>
                        <th className="text-left py-2">Dernier crawl</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => {
                        const r = results[u.url];
                        return (
                          <tr key={u.url} className="border-t border-white/10 align-top">
                            <td className="py-2 pr-4">
                              <a
                                href={u.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-white/90 hover:text-pogi-yellow"
                              >
                                {u.label}
                              </a>
                              <div className="text-white/40 text-xs break-all">{u.url}</div>
                            </td>
                            <td className="py-2 pr-4 text-white/60">{u.kind}</td>
                            <td className="py-2 pr-4">
                              {r ? <VerdictBadge r={r} /> : <span className="text-white/40 text-xs">Non vérifiée</span>}
                            </td>
                            <td className="py-2 pr-4 text-white/60">{r?.coverageState ?? r?.error ?? "—"}</td>
                            <td className="py-2 text-white/60">{fmt(r?.lastCrawlTime)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <SeoQueryRanks />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "bad" }) {
  const color =
    tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-pogi-yellow" : tone === "bad" ? "text-orange-300" : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
