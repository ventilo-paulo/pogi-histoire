import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, MousePointerClick, Percent, RefreshCw, Search, Trophy } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { seoRefreshSearchPerformance, seoSearchPerformance } from "@/lib/seo-monitor.functions";
import { percentChange, type KeyedStat, type PeriodTotals } from "@/lib/search-performance";

export const Route = createFileRoute("/admin/google")({
  head: () => ({ meta: [{ title: "Recherche Google — Back office POGI" }, { name: "robots", content: "noindex" }] }),
  component: GooglePage,
});

type Perf =
  | { hasData: false; siteUrl: string; lastCaptured: string | null }
  | {
      hasData: true;
      siteUrl: string;
      lastCaptured: string | null;
      days: number;
      current: PeriodTotals;
      previous: PeriodTotals;
      hasPrevious: boolean;
      range: { currentStart: string; endDate: string; previousStart: string; previousEnd: string };
      series: Array<{ date: string; clicks: number; impressions: number; position: number }>;
      topQueries: KeyedStat[];
      topPages: Array<KeyedStat & { label: string }>;
    };

const nf = new Intl.NumberFormat("fr-FR");
const pct = (v: number) => `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const pos = (v: number | null) => (v === null ? "—" : v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }));
const dfmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

function Trend({ change, invert = false }: { change: number | null; invert?: boolean }) {
  if (change === null || !Number.isFinite(change)) return <span className="text-xs text-white/35">pas de comparaison</span>;
  if (Math.abs(change) < 0.5) return <span className="text-xs text-white/45">stable</span>;
  const good = invert ? change < 0 : change > 0;
  const Icon = change > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${good ? "text-emerald-300" : "text-orange-300"}`}>
      <Icon size={13} />
      {change > 0 ? "+" : ""}
      {change.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %
    </span>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  trend: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-white/55 text-sm">
        <span className="text-pogi-yellow">{icon}</span>
        {label}
      </div>
      <p className="mt-2 font-display text-4xl text-white">{value}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-white/40">{hint}</span>
        {trend}
      </div>
    </div>
  );
}

function GooglePage() {
  const getPerf = useServerFn(seoSearchPerformance);
  const refresh = useServerFn(seoRefreshSearchPerformance);
  const [days, setDays] = useState(28);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(d = days) {
    setLoading(true);
    try {
      setPerf((await getPerf({ data: { days: d } })) as Perf);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function onRefresh() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await refresh();
      if (!res.ok) setError(res.error);
      else setNotice(`Chiffres mis à jour depuis Google (${res.days} jours de données).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  const cur = perf?.hasData ? perf.current : null;
  const prev = perf?.hasData && perf.hasPrevious ? perf.previous : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase text-white flex items-center gap-3">
            <Search className="text-pogi-yellow" /> Recherche Google
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Combien de fois POGI Histoire apparaît dans Google, combien de personnes cliquent, et ce qu'elles ont tapé pour
            vous trouver. Les chiffres de Google arrivent avec 2 à 3 jours de retard et sont mis à jour chaque jour.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 p-0.5" role="group" aria-label="Période">
            {[7, 28, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1.5 text-sm ${days === d ? "bg-pogi-yellow text-pogi-dark font-semibold" : "text-white/60 hover:text-white"}`}
              >
                {d} j
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-pogi-yellow px-4 py-2 text-sm font-semibold text-pogi-dark disabled:opacity-50"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Actualiser
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200">{error}</p>}
      {notice && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">{notice}</p>}

      {loading && !perf && <div className="mt-8 h-40 animate-pulse rounded-xl bg-white/5" />}

      {perf && !perf.hasData && (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-white/70">
          <p className="font-semibold text-white">Pas encore de chiffres Google pour pogi-histoire.com.</p>
          <p className="mt-2 text-sm">
            Dès que Google Search Console confirme que le site vous appartient, cliquez sur « Actualiser » : les
            impressions, clics et requêtes des derniers mois apparaîtront ici. Ensuite, la mise à jour se fait toute seule
            chaque jour.
          </p>
        </div>
      )}

      {perf?.hasData && cur && (
        <>
          <p className="mt-6 text-xs uppercase tracking-widest text-white/40">
            Du {dfmt(perf.range.currentStart)} au {dfmt(perf.range.endDate)}
            {prev ? ` · comparé aux ${perf.days} jours précédents` : ""}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={<Eye size={16} />}
              label="Impressions"
              value={nf.format(cur.impressions)}
              hint="Fois où le site est apparu dans Google"
              trend={<Trend change={prev ? percentChange(cur.impressions, prev.impressions) : null} />}
            />
            <Kpi
              icon={<MousePointerClick size={16} />}
              label="Clics"
              value={nf.format(cur.clicks)}
              hint="Lecteurs arrivés depuis Google"
              trend={<Trend change={prev ? percentChange(cur.clicks, prev.clicks) : null} />}
            />
            <Kpi
              icon={<Percent size={16} />}
              label="Taux de clic"
              value={pct(cur.ctr)}
              hint="Part des impressions devenues clics"
              trend={<Trend change={prev ? percentChange(cur.ctr, prev.ctr) : null} />}
            />
            <Kpi
              icon={<Trophy size={16} />}
              label="Position moyenne"
              value={pos(cur.position)}
              hint="1 = tout en haut de Google"
              trend={
                <Trend
                  invert
                  change={prev && cur.position !== null && prev.position !== null ? percentChange(cur.position, prev.position) : null}
                />
              }
            />
          </div>

          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-display text-xl uppercase text-white">Évolution sur 90 jours</h2>
            <p className="text-sm text-white/50">Impressions (zone claire) et clics (zone jaune) par jour.</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perf.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dfmt} tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} minTickGap={30} />
                  <YAxis yAxisId="imp" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="clk" orientation="right" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelFormatter={(l) => dfmt(String(l))}
                    formatter={(v: number, name: string) => [nf.format(v), name === "impressions" ? "Impressions" : "Clics"]}
                  />
                  <Area yAxisId="imp" type="monotone" dataKey="impressions" stroke="rgba(255,255,255,0.6)" fill="rgba(255,255,255,0.08)" />
                  <Area yAxisId="clk" type="monotone" dataKey="clicks" stroke="var(--color-pogi-yellow)" fill="rgba(245,200,0,0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <StatTable
              title="Requêtes qui amènent des lecteurs"
              subtitle="Ce que les gens ont tapé dans Google avant de voir ou cliquer sur POGI."
              empty="Google ne montre pas encore de requête (il masque les recherches trop rares)."
              rows={perf.topQueries.map((q) => ({ ...q, label: q.key }))}
            />
            <StatTable
              title="Pages qui reçoivent ces lecteurs"
              subtitle="Pages de POGI affichées dans Google, classées par clics."
              empty="Aucune page n'a encore été affichée dans Google sur cette période."
              rows={perf.topPages}
              link
            />
          </div>

          {perf.lastCaptured && (
            <p className="mt-6 text-xs text-white/35">
              Dernière récupération auprès de Google : {new Date(perf.lastCaptured).toLocaleString("fr-FR")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatTable({
  title,
  subtitle,
  empty,
  rows,
  link = false,
}: {
  title: string;
  subtitle: string;
  empty: string;
  rows: Array<KeyedStat & { label: string }>;
  link?: boolean;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-display text-xl uppercase text-white">{title}</h2>
      <p className="text-sm text-white/50">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">{empty}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3 font-medium">{link ? "Page" : "Requête"}</th>
                <th className="py-2 px-2 text-right font-medium">Clics</th>
                <th className="py-2 px-2 text-right font-medium">Impr.</th>
                <th className="py-2 px-2 text-right font-medium">Taux</th>
                <th className="py-2 pl-2 text-right font-medium">Pos.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-white/5">
                  <td className="py-2 pr-3 text-white/85 max-w-[280px] truncate" title={r.key}>
                    {link ? (
                      <a href={r.key} target="_blank" rel="noopener noreferrer" className="hover:text-pogi-yellow">
                        {r.label}
                      </a>
                    ) : (
                      r.label
                    )}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-white">{nf.format(r.clicks)}</td>
                  <td className="py-2 px-2 text-right text-white/70">{nf.format(r.impressions)}</td>
                  <td className="py-2 px-2 text-right text-white/70">{pct(r.ctr)}</td>
                  <td className="py-2 pl-2 text-right text-white/70">{pos(r.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
