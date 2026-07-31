import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { healthState } from "@/lib/health.functions";
import { seoMonitorState } from "@/lib/seo-monitor.functions";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  HeartPulse,
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
    return all
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 12);
  }, [health, seo]);

  const allGood = failing.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display uppercase text-3xl text-white">Statut du site</h1>
          <p className="text-white/60 text-sm mt-1">
            Vue d'ensemble : disponibilité des pages, incidents récents et indexation Google.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

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
