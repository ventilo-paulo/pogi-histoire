import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { seoRankState, seoRefreshRanks } from "@/lib/seo-monitor.functions";
import { ArrowDown, ArrowUp, Minus, RefreshCw, TrendingUp } from "lucide-react";

type Summary = {
  query: string;
  position: number;
  previousPosition: number | null;
  delta: number | null;
  clicks: number;
  impressions: number;
  ctr: number;
  history: Array<{ date: string; position: number; clicks: number; impressions: number }>;
};

function Spark({ history }: { history: Summary["history"] }) {
  const pts = history.slice(-28);
  if (pts.length < 2) return <span className="text-white/30 text-xs">—</span>;
  const w = 120;
  const h = 28;
  const positions = pts.map((p) => p.position);
  const min = Math.min(...positions);
  const max = Math.max(...positions);
  const span = Math.max(max - min, 0.5);
  // Lower position = better = higher on the chart.
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = ((p.position - min) / span) * (h - 4) + 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-pogi-yellow" />
    </svg>
  );
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null || Math.abs(delta) < 0.1) {
    return (
      <span className="inline-flex items-center gap-1 text-white/40 text-xs">
        <Minus size={13} /> stable
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-300 text-xs">
        <ArrowUp size={13} /> +{delta.toFixed(1)} places
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-orange-300 text-xs">
      <ArrowDown size={13} /> {delta.toFixed(1)} places
    </span>
  );
}

export function SeoQueryRanks() {
  const getState = useServerFn(seoRankState);
  const refresh = useServerFn(seoRefreshRanks);
  const [rows, setRows] = useState<Summary[]>([]);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"impressions" | "position" | "delta">("impressions");

  async function load() {
    try {
      const res = (await getState()) as any;
      setRows(res.queries ?? []);
      setLastDate(res.lastDate ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRefresh() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = (await refresh()) as any;
      setNotice(`${res.rows} lignes récupérées (${res.startDate} → ${res.endDate}).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? rows.filter((r) => r.query.toLowerCase().includes(needle)) : rows;
    const sorted = [...list];
    if (sort === "position") sorted.sort((a, b) => a.position - b.position);
    else if (sort === "delta") sorted.sort((a, b) => (b.delta ?? -99) - (a.delta ?? -99));
    else sorted.sort((a, b) => b.impressions - a.impressions);
    return sorted;
  }, [rows, q, sort]);

  const climbing = rows.filter((r) => (r.delta ?? 0) >= 1).length;
  const top10 = rows.filter((r) => r.position <= 10).length;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl uppercase text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-pogi-yellow" /> Positions par requête
          </h2>
          <p className="text-white/50 text-sm">
            Position moyenne sur Google (7 derniers jours) comparée aux 7 jours précédents.
            {lastDate ? ` Dernières données : ${lastDate}.` : " Aucune donnée enregistrée pour l'instant."}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-pogi-yellow px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Actualiser les positions
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200">{error}</p>}
      {notice && <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">{notice}</p>}

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-white/50">Requêtes suivies</p>
          <p className="text-2xl font-bold text-white">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-white/50">En progression</p>
          <p className="text-2xl font-bold text-emerald-300">{climbing}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-white/50">Dans le top 10</p>
          <p className="text-2xl font-bold text-pogi-yellow">{top10}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer une requête…"
          className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="impressions">Trier : impressions</option>
          <option value="position">Trier : meilleure position</option>
          <option value="delta">Trier : plus fortes hausses</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="text-left py-2 px-3 font-medium">Requête</th>
              <th className="text-left py-2 px-3 font-medium">Position</th>
              <th className="text-left py-2 px-3 font-medium">Évolution</th>
              <th className="text-left py-2 px-3 font-medium">Tendance</th>
              <th className="text-left py-2 px-3 font-medium">Clics</th>
              <th className="text-left py-2 px-3 font-medium">Impr.</th>
              <th className="text-left py-2 px-3 font-medium">CTR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 px-3 text-center text-white/40">
                  Aucune donnée. Cliquez sur « Actualiser les positions ».
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.query} className="border-t border-white/10">
                <td className="py-2 px-3 text-white/90">{r.query}</td>
                <td className="py-2 px-3 text-white font-semibold">{r.position.toFixed(1)}</td>
                <td className="py-2 px-3">
                  <Delta delta={r.delta} />
                </td>
                <td className="py-2 px-3">
                  <Spark history={r.history} />
                </td>
                <td className="py-2 px-3 text-white/70">{r.clicks}</td>
                <td className="py-2 px-3 text-white/70">{r.impressions}</td>
                <td className="py-2 px-3 text-white/70">{(r.ctr * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
