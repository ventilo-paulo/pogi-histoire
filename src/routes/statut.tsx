import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { publicSiteStatus } from "@/lib/status.functions";
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";

const TITLE = "Statut du site — POGI Histoire";
const DESC =
  "État en temps réel du site POGI Histoire : disponibilité des pages, incidents récents et historique des vérifications automatiques.";

export const Route = createFileRoute("/statut")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pogi-histoire.lovable.app/statut" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pogi-histoire.lovable.app/statut" }],
  }),
  component: StatusPage,
});

type State = Awaited<ReturnType<typeof publicSiteStatus>> | null;

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

function StatusPage() {
  const fetchStatus = useServerFn(publicSiteStatus);
  const [data, setData] = useState<State>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await fetchStatus()) as State);
    } catch (e: any) {
      setError(e?.message ?? "Statut indisponible pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const failing = data?.failing ?? [];
  const allGood = !!data && failing.length === 0;

  return (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <main className="mx-auto max-w-[900px] px-6 py-16 md:py-24">
        <p className="text-pogi-yellow uppercase tracking-widest text-xs font-bold mb-3">Transparence</p>
        <h1 className="font-display uppercase text-[40px] md:text-[56px] leading-[1.05]">Statut du site</h1>
        <p className="mt-4 text-[17px] leading-[1.75] text-pogi-dark/80">
          Nos pages, images et services sont vérifiés automatiquement toutes les heures. Cette page
          affiche l'état actuel, les incidents récents et l'historique des contrôles.
        </p>

        <button
          onClick={() => void load()}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-pogi-dark/20 px-4 py-2 text-sm hover:bg-pogi-dark/5 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} /> Actualiser
        </button>

        {error && (
          <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && !data ? (
          <p className="mt-8 text-pogi-dark/60">Chargement…</p>
        ) : data ? (
          <>
            {/* État global */}
            <section
              className={`mt-8 rounded-xl border p-5 ${
                allGood ? "border-emerald-600/30 bg-emerald-500/10" : "border-red-600/30 bg-red-500/10"
              }`}
            >
              <div className="flex items-start gap-3">
                {allGood ? (
                  <CheckCircle2 className="text-emerald-700 mt-0.5" size={22} />
                ) : (
                  <AlertTriangle className="text-red-700 mt-0.5" size={22} />
                )}
                <div>
                  <p className="font-semibold">
                    {allGood
                      ? "Tous les services fonctionnent normalement"
                      : `${failing.length} élément(s) actuellement en incident`}
                  </p>
                  <p className="text-sm text-pogi-dark/70 mt-1">
                    {data.okCount}/{data.total} éléments sains · dernier contrôle {fmt(data.lastRun?.started_at)}
                  </p>
                </div>
              </div>
            </section>

            {/* Incidents en cours */}
            {failing.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display uppercase text-2xl mb-3">Incidents en cours</h2>
                <ul className="divide-y divide-pogi-dark/10 rounded-xl border border-pogi-dark/10 bg-white/60">
                  {failing.map((c) => (
                    <li key={c.target} className="p-4 flex items-start gap-3">
                      <XCircle size={16} className="text-red-700 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium break-words">{c.label}</p>
                        <p className="text-xs text-pogi-dark/60 mt-0.5">
                          Depuis {fmt(c.failing_since)} · dernier contrôle {fmt(c.checked_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Incidents récents */}
            <section className="mt-10">
              <h2 className="font-display uppercase text-2xl mb-3 flex items-center gap-2">
                <Activity size={20} /> Incidents récents
              </h2>
              {data.incidents.length === 0 ? (
                <p className="text-pogi-dark/60 text-sm">Aucun incident signalé récemment.</p>
              ) : (
                <ul className="divide-y divide-pogi-dark/10 rounded-xl border border-pogi-dark/10 bg-white/60">
                  {data.incidents.map((a: any) => (
                    <li key={a.id} className="p-4 flex items-start gap-3">
                      {a.level === "error" ? (
                        <XCircle size={16} className="text-red-700 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-700 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm break-words">{a.title}</p>
                        <p className="text-xs text-pogi-dark/60 mt-0.5">{fmt(a.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Historique */}
            <section className="mt-10">
              <h2 className="font-display uppercase text-2xl mb-3 flex items-center gap-2">
                <Clock size={20} /> Historique des vérifications
              </h2>
              {data.runs.length === 0 ? (
                <p className="text-pogi-dark/60 text-sm">Aucune vérification enregistrée.</p>
              ) : (
                <ul className="divide-y divide-pogi-dark/10 rounded-xl border border-pogi-dark/10 bg-white/60 text-sm">
                  {data.runs.map((r: any) => (
                    <li key={r.id} className="p-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-pogi-dark/80">{fmt(r.started_at)}</span>
                      {r.ok ? (
                        <span className="text-emerald-700 text-xs font-semibold">OK</span>
                      ) : (
                        <span className="text-red-700 text-xs font-semibold">
                          {r.checks_failed} incident(s)
                        </span>
                      )}
                      <span className="text-pogi-dark/60 text-xs">{r.checks_total} contrôles</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-sm text-pogi-dark/60">
                Vous constatez un problème non listé ?{" "}
                <a href="mailto:paul.lesaulnier27@gmail.com" className="underline hover:text-pogi-yellow">
                  Signalez-le nous
                </a>
                . Un accès détaillé (diagnostics, captures, indexation) est disponible pour l'équipe dans{" "}
                <Link to="/admin/health" className="underline hover:text-pogi-yellow">
                  le back office
                </Link>
                .
              </p>
            </section>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
