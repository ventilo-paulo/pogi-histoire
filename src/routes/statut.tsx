import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { publicStatus } from "@/lib/public-status.functions";

const TITLE = "Statut du site — POGI Histoire";
const DESC =
  "État de fonctionnement du site POGI Histoire : contrôles automatiques des pages et des images, et résultat du dernier contrôle.";

export const Route = createFileRoute("/statut")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pogi-histoire.com/statut" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pogi-histoire.com/statut" }],
  }),
  loader: () => publicStatus(),
  component: StatusPage,
});

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

function StatusPage() {
  const s = Route.useLoaderData();
  const ok = s.operational;

  return (
    <div className="min-h-screen bg-pogi-light text-pogi-dark">
      <Navbar />
      <main className="mx-auto max-w-[820px] px-6 py-16 md:py-24">
        <Reveal>
          <p className="text-pogi-yellow uppercase tracking-widest text-xs font-bold mb-3">
            Transparence
          </p>
          <h1 className="font-display uppercase text-[40px] md:text-[56px] leading-[1.05]">
            Statut du site
          </h1>
        </Reveal>

        <Reveal>
          <div
            className={`mt-10 rounded-xl border p-6 flex items-start gap-4 ${
              ok ? "border-emerald-600/30 bg-emerald-600/10" : "border-red-600/30 bg-red-600/10"
            }`}
          >
            {ok ? (
              <CheckCircle2 className="text-emerald-700 shrink-0" size={28} aria-hidden="true" />
            ) : (
              <AlertTriangle className="text-red-700 shrink-0" size={28} aria-hidden="true" />
            )}
            <div>
              <p className="font-display uppercase text-xl">
                {ok ? "Tous les systèmes sont opérationnels" : "Incident en cours"}
              </p>
              <p className="text-sm text-pogi-dark/70 mt-1">
                {s.total > 0
                  ? `${s.total - s.failed} contrôle(s) au vert sur ${s.total}.`
                  : "Aucun contrôle enregistré pour le moment."}
              </p>
            </div>
          </div>
        </Reveal>

        {s.groups.length > 0 && (
          <Reveal>
            <section className="mt-10">
              <h2 className="font-display uppercase text-2xl mb-4">Contrôles automatiques</h2>
              <ul className="divide-y divide-pogi-dark/10 border-y border-pogi-dark/10">
                {s.groups.map((g) => (
                  <li key={g.label} className="py-3 flex items-center justify-between gap-4">
                    <span>{g.label}</span>
                    <span
                      className={`text-sm font-semibold ${
                        g.failed === 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {g.failed === 0 ? "Opérationnel" : `${g.failed} problème(s)`}
                      <span className="text-pogi-dark/50 font-normal"> · {g.total} testé(s)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        <Reveal>
          <section className="mt-10">
            <h2 className="font-display uppercase text-2xl mb-4">Dernier contrôle</h2>
            {s.lastRun ? (
              <p className="text-[17px] leading-[1.75]">
                <strong>{s.lastRun.ok && s.lastRun.failed === 0 ? "OK" : "KO"}</strong> —{" "}
                {fmt(s.lastRun.startedAt)} · {s.lastRun.total} élément(s) testé(s),{" "}
                {s.lastRun.failed} en erreur.
              </p>
            ) : (
              <p className="text-pogi-dark/60">Aucun contrôle enregistré.</p>
            )}
            <p className="text-xs text-pogi-dark/50 mt-3 flex items-center gap-2">
              <RefreshCw size={13} aria-hidden="true" /> Contrôles automatiques toutes les heures ·
              page actualisée le {fmt(s.checkedAt)}
            </p>
          </section>
        </Reveal>

        {s.history.length > 1 && (
          <Reveal>
            <section className="mt-10">
              <h2 className="font-display uppercase text-2xl mb-4">Historique récent</h2>
              <ul className="divide-y divide-pogi-dark/10 border-y border-pogi-dark/10 text-sm">
                {s.history.map((r) => (
                  <li key={r.startedAt} className="py-2.5 flex items-center justify-between gap-4">
                    <span className="text-pogi-dark/70">{fmt(r.startedAt)}</span>
                    <span className={r.ok && r.failed === 0 ? "text-emerald-700" : "text-red-700"}>
                      {r.ok && r.failed === 0 ? "OK" : `KO (${r.failed})`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}
      </main>
      <Footer />
    </div>
  );
}
