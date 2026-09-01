import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  healthState,
  healthRunNow,
  healthAutoRepair,
  healthSaveSettings,
  healthMarkAlertsRead,
  healthSendDigest,
} from "@/lib/health.functions";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Image as ImageIcon,
  Database,
  Globe,
  Play,
  RefreshCw,
  XCircle,
  Mail,
  Wrench,
} from "lucide-react";


export const Route = createFileRoute("/admin/health")({
  head: () => ({
    meta: [{ title: "Santé du site — Admin POGI", name: "robots", content: "noindex" }],
  }),
  component: AdminHealth,
});

type Check = {
  target: string;
  kind: string;
  label: string;
  status: string;
  http_status: number | null;
  response_ms: number | null;
  detail: string | null;
  redirect_chain?: string | null;
  response_bytes?: number | null;
  snapshot_url?: string | null;
  checked_at: string;
  last_ok_at: string | null;
  failing_since: string | null;
};

function fmtBytes(n?: number | null) {
  if (n == null) return null;
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger: string;
  ok: boolean;
  checks_total: number;
  checks_ok: number;
  checks_failed: number;
  duration_ms: number | null;
  message: string | null;
};
type Alert = {
  id: string;
  created_at: string;
  level: string;
  title: string;
  detail: string | null;
  target: string | null;
  read_at: string | null;
};
type Settings = {
  enabled: boolean;
  email_enabled: boolean;
  daily_summary_enabled?: boolean;
  notify_email: string | null;
  monitor_base_url?: string | null;
  retest_at?: string | null;
  retest_reason?: string | null;
} | null;


function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === "image") return <ImageIcon size={14} />;
  if (kind === "database") return <Database size={14} />;
  if (kind === "asset") return <FileWarning size={14} />;
  return <Globe size={14} />;
}

function AdminHealth() {
  const state = useServerFn(healthState);
  const runNow = useServerFn(healthRunNow);
  const saveSettings = useServerFn(healthSaveSettings);
  const markRead = useServerFn(healthMarkAlertsRead);
  const sendDigest = useServerFn(healthSendDigest);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<Settings>(null);
  const [email, setEmail] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await state({ data: {} as any });
      setRuns(res.runs);
      setChecks(res.checks);
      setAlerts(res.alerts);
      setSettings(res.settings);
      setEmail(res.settings?.notify_email ?? "");
      setBaseUrl(res.settings?.monitor_base_url ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSendDigest = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r: any = await sendDigest({ data: {} as any });
      setNotice(
        r?.skipped
          ? "Récapitulatif désactivé ou adresse email manquante."
          : `Récapitulatif envoyé : ${r.checks} vérifications, ${r.errors} erreur(s), ${r.recovered} rétablissement(s).`,
      );
    } catch (e: any) {
      setError(e?.message ?? "Envoi impossible");
    } finally {
      setBusy(false);
    }
  };

  const onRun = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r: any = await runNow({ data: {} as any });
      setNotice(
        r?.ok
          ? `Contrôle terminé : ${r.total} éléments vérifiés, tout fonctionne.`
          : `Contrôle terminé : ${r?.failed ?? "?"} problème(s) détecté(s).`,
      );
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Le contrôle a échoué");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await saveSettings({ data: patch as any });
      await load();
      setNotice("Préférences enregistrées.");
    } catch (e: any) {
      setError(e?.message ?? "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  };

  const failing = useMemo(() => checks.filter((c) => c.status === "fail"), [checks]);
  const healthy = useMemo(() => checks.filter((c) => c.status === "ok"), [checks]);
  const unread = useMemo(() => alerts.filter((a) => !a.read_at), [alerts]);
  const lastRun = runs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display uppercase text-3xl text-white">Santé du site</h1>
          <p className="text-white/60 text-sm mt-1">
            Surveillance automatique des pages, images, fichiers techniques et de la base de données.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            disabled={busy || loading}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={16} /> Actualiser
          </button>
          <button
            onClick={() => void onRun()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-pogi-yellow px-4 py-2 text-sm font-bold uppercase text-pogi-dark disabled:opacity-50"
          >
            <Play size={16} /> Lancer un contrôle
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
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
          {/* Statut global */}
          <div
            className={`rounded-xl border p-5 ${
              failing.length
                ? "border-red-500/40 bg-red-500/10"
                : "border-emerald-500/40 bg-emerald-500/10"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {failing.length ? (
                <AlertTriangle className="text-red-300" size={22} />
              ) : (
                <CheckCircle2 className="text-emerald-300" size={22} />
              )}
              <div>
                <p className="text-white font-semibold">
                  {failing.length
                    ? `${failing.length} problème(s) détecté(s) sur le site`
                    : "Tout fonctionne normalement"}
                </p>
                <p className="text-white/60 text-sm">
                  Dernier contrôle : {fmt(lastRun?.started_at)} ({lastRun?.trigger === "manual" ? "manuel" : "automatique"}) ·{" "}
                  {healthy.length} élément(s) sains
                </p>
              </div>
            </div>
          </div>

          {/* Alertes */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-display uppercase text-white text-lg flex items-center gap-2">
                <Activity size={18} /> Alertes {unread.length > 0 && `(${unread.length} non lues)`}
              </h2>
              {unread.length > 0 && (
                <button
                  onClick={async () => {
                    await markRead({ data: {} as any });
                    void load();
                  }}
                  className="text-xs text-white/70 hover:text-white underline"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            {alerts.length === 0 ? (
              <p className="text-white/50 text-sm">Aucune alerte pour le moment.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {alerts.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-start gap-3">
                    {a.level === "error" ? (
                      <XCircle size={16} className="text-red-300 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 size={16} className="text-emerald-300 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm ${a.read_at ? "text-white/60" : "text-white"}`}>{a.title}</p>
                      {a.detail && <p className="text-xs text-white/50 break-words">{a.detail}</p>}
                      <p className="text-xs text-white/40 mt-0.5">{fmt(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Détail des contrôles */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-display uppercase text-white text-lg mb-3">Éléments surveillés</h2>
            {checks.length === 0 ? (
              <p className="text-white/50 text-sm">
                Aucun contrôle enregistré. Lancez un contrôle pour initialiser la surveillance.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-white/50 text-xs uppercase">
                      <th className="py-2 pr-3">Élément</th>
                      <th className="py-2 pr-3">État</th>
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Temps</th>
                      <th className="py-2">Détail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {[...failing, ...healthy].map((c) => (
                      <tr key={c.target}>
                        <td className="py-2 pr-3 text-white/85">
                          <span className="inline-flex items-center gap-2">
                            <KindIcon kind={c.kind} />
                            <span className="truncate max-w-[280px]" title={c.target}>
                              {c.label}
                            </span>
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {c.status === "ok" ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs">
                              <CheckCircle2 size={14} /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-red-300 text-xs">
                              <XCircle size={14} /> Cassé
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-white/60">{c.http_status ?? "—"}</td>
                        <td className="py-2 pr-3 text-white/60">
                          {c.response_ms != null ? `${c.response_ms} ms` : "—"}
                        </td>
                        <td className="py-2 text-white/60">
                          {c.detail ?? "—"}
                          <span className="block text-xs text-white/40">
                            HTTP {c.http_status ?? "aucune réponse"}
                            {fmtBytes(c.response_bytes) ? ` · ${fmtBytes(c.response_bytes)}` : ""}
                          </span>
                          {c.redirect_chain && (
                            <span className="block text-xs text-amber-200/70 whitespace-pre-line break-all">
                              {c.redirect_chain}
                            </span>
                          )}
                          {c.status === "fail" && c.failing_since && (
                            <span className="block text-xs text-white/40">
                              depuis {fmt(c.failing_since)}
                            </span>
                          )}
                          {c.status === "fail" && c.snapshot_url && (
                            <a href={c.target} target="_blank" rel="noreferrer">
                              <img
                                src={c.snapshot_url}
                                alt={`Aperçu de ${c.label}`}
                                loading="lazy"
                                className="mt-2 w-40 rounded-md border border-white/15 bg-black/40"
                              />
                            </a>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Adresse surveillée */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <h2 className="font-display uppercase text-white text-lg flex items-center gap-2">
              <Globe size={18} /> Adresse surveillée
            </h2>
            <p className="text-xs text-white/50">
              Version du site réellement contrôlée par la surveillance. Utile lorsque le nom de
              domaine n'est pas encore branché sur la version en ligne.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://pogi-histoire.com"
                className="min-w-[18rem] rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
              <button
                onClick={() => void onSave({ monitor_base_url: baseUrl.trim() || null })}
                disabled={busy}
                className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                Enregistrer l'adresse surveillée
              </button>
            </div>
            <p className="text-xs text-white/50">
              Après tout changement d'adresse, un contrôle de santé est relancé automatiquement 30
              minutes plus tard.
            </p>
            {settings?.retest_at && (
              <p className="text-xs text-pogi-yellow">
                Re-test automatique programmé le {fmt(settings.retest_at)}
                {settings.retest_reason ? ` — ${settings.retest_reason}` : ""}
              </p>
            )}
          </section>


          {/* Notifications */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="font-display uppercase text-white text-lg flex items-center gap-2">
              <Mail size={18} /> Notifications
            </h2>
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={settings?.enabled ?? true}
                onChange={(e) => void onSave({ enabled: e.target.checked })}
                className="size-4 accent-[var(--color-pogi-yellow,#f5c518)]"
              />
              Surveillance automatique (contrôle toutes les heures)
            </label>
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={settings?.email_enabled ?? false}
                onChange={(e) => void onSave({ email_enabled: e.target.checked })}
                className="size-4 accent-[var(--color-pogi-yellow,#f5c518)]"
              />
              M'envoyer un email dès qu'un problème est détecté (ou rétabli)
            </label>
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={settings?.daily_summary_enabled ?? true}
                onChange={(e) => void onSave({ daily_summary_enabled: e.target.checked })}
                className="size-4 accent-[var(--color-pogi-yellow,#f5c518)]"
              />
              Récapitulatif quotidien par email (7h00) : nombre de contrôles, erreurs et éléments rétablis
            </label>
            <button
              onClick={() => void onSendDigest()}
              disabled={busy}
              className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
            >
              Envoyer le récapitulatif maintenant
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adresse@exemple.com"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
              <button
                onClick={() => void onSave({ notify_email: email })}
                disabled={busy}
                className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                Enregistrer l'adresse
              </button>
            </div>
            <p className="text-xs text-white/40">
              Les emails partent depuis notify.pogi-histoire.com : ils ne seront délivrés qu'une fois la
              vérification DNS du domaine terminée.
            </p>
          </section>

          {/* Historique */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-display uppercase text-white text-lg mb-3 flex items-center gap-2">
              <Clock size={18} /> Historique des contrôles
            </h2>
            {runs.length === 0 ? (
              <p className="text-white/50 text-sm">Aucune exécution enregistrée.</p>
            ) : (
              <ul className="divide-y divide-white/10 text-sm">
                {runs.map((r) => (
                  <li key={r.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-white/70">{fmt(r.started_at)}</span>
                    <span className="text-white/40 text-xs uppercase">
                      {r.trigger === "manual" ? "manuel" : "auto"}
                    </span>
                    {r.ok ? (
                      <span className="text-emerald-300 text-xs">OK</span>
                    ) : (
                      <span className="text-red-300 text-xs">{r.checks_failed} échec(s)</span>
                    )}
                    <span className="text-white/50 text-xs">
                      {r.checks_total} contrôles · {r.duration_ms ? `${Math.round(r.duration_ms / 100) / 10}s` : "—"}
                    </span>
                    {r.message && <span className="text-white/40 text-xs">{r.message}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
