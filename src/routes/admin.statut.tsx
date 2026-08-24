import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { healthState } from "@/lib/health.functions";
import { seoMonitorState } from "@/lib/seo-monitor.functions";
import { supervisionExportData, supervisionRunStep } from "@/lib/supervision.functions";
import { downloadCsv, openPdf } from "@/lib/supervision-export";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Gauge,
  HeartPulse,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/statut")({
  head: () => ({
    meta: [{ title: "Statut du site — Admin POGI", name: "robots", content: "noindex" }],
  }),
  component: AdminStatut,
});

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

function AdminStatut() {
  const getHealth = useServerFn(healthState);
  const getSeo = useServerFn(seoMonitorState);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [seo, setSeo] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, s] = await Promise.all([
        getHealth({ data: {} as any }),
        getSeo({ data: {} as any }).catch(() => null),
      ]);
      setHealth(h);
      setSeo(s);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [getHealth, getSeo]);

  useEffect(() => {
    void load();
  }, [load]);

  const checks: any[] = health?.checks ?? [];
  const failing = useMemo(() => checks.filter((c) => c.status === "fail"), [checks]);
  const lastHealthRun = health?.runs?.[0];
  const lastSeoRun = seo?.runs?.[0];
  const seoStatuses: any[] = seo?.statuses ?? [];
  const indexed = seoStatuses.filter((s) => s.verdict === "PASS").length;
  const incidents: any[] = useMemo(() => {
    const all = [...(health?.alerts ?? []), ...(seo?.alerts ?? [])];
    const unique = new Map<string, any>();
    for (const a of all) unique.set(String(a?.id ?? `${a?.kind}-${a?.created_at}-${a?.title}`), a);
    return [...unique.values()]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 12);
  }, [health, seo]);


  const allGood = failing.length === 0;

  /* ---- Relance immédiate des contrôles ---- */
  const runStep = useServerFn(supervisionRunStep);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);

  const runAllChecks = useCallback(async () => {
    setRunning(true);
    setRunResult(null);
    setError(null);
    const lines: string[] = [];
    try {
      setProgress({ pct: 10, label: "Contrôle de santé du site en cours…" });
      const h: any = await runStep({ data: { step: "health" } });
      lines.push(`Santé : ${h.total} élément(s) testé(s), ${h.failed} en erreur`);
      setProgress({ pct: 55, label: "Vérification de l'indexation Google…" });
      try {
        const s: any = await runStep({ data: { step: "seo" } });
        lines.push(`Indexation : ${s.total} URL contrôlée(s), ${s.recovered} indexée(s)`);
      } catch (e: any) {
        lines.push(`Indexation : échec (${e?.message ?? "erreur"})`);
      }
      setProgress({ pct: 90, label: "Actualisation du tableau de bord…" });
      await load();
      setProgress({ pct: 100, label: "Terminé" });
      setRunResult(lines.join(" · "));
    } catch (e: any) {
      setError(e?.message ?? "Le contrôle a échoué");
    } finally {
      setRunning(false);
      setTimeout(() => setProgress(null), 2500);
    }
  }, [runStep, load]);

  /* ---- Export CSV / PDF ---- */
  const fetchExport = useServerFn(supervisionExportData);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const doExport = useCallback(
    async (kind: "csv" | "pdf") => {
      setExporting(kind);
      setExportError(null);
      try {
        const data: any = await fetchExport({ data: { from, to } });
        if (kind === "csv") downloadCsv(data);
        else openPdf(data);
      } catch (e: any) {
        setExportError(e?.message ?? "Export impossible");
      } finally {
        setExporting(null);
      }
    },
    [fetchExport, from, to],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display uppercase text-3xl text-white">Statut du site</h1>
          <p className="text-white/60 text-sm mt-1">
            Vue d'ensemble : disponibilité des pages, incidents récents et indexation Google.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void runAllChecks()}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-md bg-pogi-yellow px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? "Contrôle en cours…" : "Lancer un check maintenant"}
          </button>
          <button
            onClick={() => void load()}
            disabled={loading || running}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
      </div>

      {progress && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>{progress.label}</span>
            <span className="text-white/50">{progress.pct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-pogi-yellow transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {runResult && !running && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {runResult}
        </div>
      )}

      {/* Export de l'historique */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display uppercase text-white text-lg flex items-center gap-2">
          <Download size={18} /> Export de l'historique
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Contrôles de santé, contrôles d'indexation et incidents sur la période choisie.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs uppercase tracking-wide text-white/50">
            Du
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Au
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            onClick={() => void doExport("csv")}
            disabled={!!exporting}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/5 disabled:opacity-50"
          >
            {exporting === "csv" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Export CSV
          </button>
          <button
            onClick={() => void doExport("pdf")}
            disabled={!!exporting}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/5 disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            Export PDF
          </button>
        </div>
        {exportError && <p className="mt-3 text-sm text-red-300">{exportError}</p>}
      </section>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-white/60">Chargement…</p>
      ) : (
        <>
          {/* État global */}
          <div
            className={`rounded-xl border p-5 ${
              allGood ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {allGood ? (
                <CheckCircle2 className="text-emerald-300" size={22} />
              ) : (
                <AlertTriangle className="text-red-300" size={22} />
              )}
              <div>
                <p className="text-white font-semibold">
                  {allGood
                    ? "Tout fonctionne normalement"
                    : `${failing.length} élément(s) en incident`}
                </p>
                <p className="text-white/60 text-sm">
                  {checks.length - failing.length}/{checks.length} éléments sains · dernier contrôle{" "}
                  {fmt(lastHealthRun?.started_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Deux volets : santé & indexation */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to="/admin/health"
              className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors block"
            >
              <h2 className="font-display uppercase text-white text-lg flex items-center gap-2">
                <HeartPulse size={18} /> Santé du site
              </h2>
              <p className="text-white/60 text-sm mt-2">
                {checks.length} éléments surveillés · {failing.length} en erreur
              </p>
              <p className="text-white/40 text-xs mt-1">
                Dernier contrôle : {fmt(lastHealthRun?.started_at)}
              </p>
              <span className="text-pogi-yellow text-sm mt-3 inline-block">Ouvrir le détail →</span>
            </Link>

            <Link
              to="/admin/seo"
              className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors block"
            >
              <h2 className="font-display uppercase text-white text-lg flex items-center gap-2">
                <Gauge size={18} /> Indexation
              </h2>
              <p className="text-white/60 text-sm mt-2">
                {seo ? `${indexed}/${seoStatuses.length} URL indexées` : "Données indisponibles"}
              </p>
              <p className="text-white/40 text-xs mt-1">
                Dernière vérification : {fmt(lastSeoRun?.started_at)}
              </p>
              <span className="text-pogi-yellow text-sm mt-3 inline-block">Ouvrir le détail →</span>
            </Link>
          </div>

          {/* Incidents en cours */}
          {failing.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="font-display uppercase text-white text-lg mb-3">Incidents en cours</h2>
              <ul className="divide-y divide-white/10">
                {failing.map((c: any) => (
                  <li key={c.target} className="py-2.5 flex items-start gap-3">
                    <XCircle size={16} className="text-red-300 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm break-words">{c.label}</p>
                      <p className="text-xs text-white/50">
                        Depuis {fmt(c.failing_since)} · HTTP {c.http_status ?? "aucune réponse"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Incidents récents */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-display uppercase text-white text-lg mb-3 flex items-center gap-2">
              <Activity size={18} /> Incidents récents
            </h2>
            {incidents.length === 0 ? (
              <p className="text-white/50 text-sm">Aucun incident signalé récemment.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {incidents.map((a: any) => (
                  <li key={a.id} className="py-2.5 flex items-start gap-3">
                    {a.level === "error" ? (
                      <XCircle size={16} className="text-red-300 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 size={16} className="text-emerald-300 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-white/85 break-words">{a.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {fmt(a.created_at)} · {a.kind === "health" ? "santé" : "indexation"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Historique des checks */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-display uppercase text-white text-lg mb-3 flex items-center gap-2">
              <Clock size={18} /> Historique des contrôles
            </h2>
            {(health?.runs ?? []).length === 0 ? (
              <p className="text-white/50 text-sm">Aucune exécution enregistrée.</p>
            ) : (
              <ul className="divide-y divide-white/10 text-sm">
                {(health?.runs ?? []).map((r: any) => (
                  <li key={r.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-white/70">{fmt(r.started_at)}</span>
                    <span className="text-white/40 text-xs uppercase">
                      {r.trigger === "manual" ? "manuel" : "auto"}
                    </span>
                    {r.ok ? (
                      <span className="text-emerald-300 text-xs">OK</span>
                    ) : (
                      <span className="text-red-300 text-xs">{r.checks_failed} incident(s)</span>
                    )}
                    <span className="text-white/50 text-xs">{r.checks_total} contrôles</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-3 text-sm">
              <Link to="/admin/health" className="text-pogi-yellow hover:underline">
                Historique santé complet →
              </Link>
              <Link to="/admin/seo" className="text-pogi-yellow hover:underline">
                Historique indexation →
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
