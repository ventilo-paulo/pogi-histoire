import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getNotionSettings, saveNotionSettings, listSyncLog, runSyncNow, testNotionConnection, createArticlesNotionDatabase } from "@/lib/notion.functions";
import { Loader2, RefreshCw, Plug, CheckCircle2, XCircle, Play, Pause, Plus } from "lucide-react";


export const Route = createFileRoute("/admin/notion")({ component: NotionAdmin });

function NotionAdmin() {
  const router = useRouter();
  const getSettings = useServerFn(getNotionSettings);
  const save = useServerFn(saveNotionSettings);
  const listLog = useServerFn(listSyncLog);
  const runNow = useServerFn(runSyncNow);
  const test = useServerFn(testNotionConnection);
  const createDb = useServerFn(createArticlesNotionDatabase);

  const settingsQ = useQuery({ queryKey: ["notion-settings"], queryFn: () => getSettings() });
  const logsQ = useQuery({ queryKey: ["notion-log"], queryFn: () => listLog(), refetchInterval: 15000 });

  const [articlesDb, setArticlesDb] = useState("");
  const [videosDb, setVideosDb] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [parentPage, setParentPage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data?.settings) {
      setArticlesDb(settingsQ.data.settings.articles_db_id ?? "");
      setVideosDb(settingsQ.data.settings.videos_db_id ?? "");
      setEnabled(settingsQ.data.settings.enabled ?? true);
    }
  }, [settingsQ.data]);

  async function onSave() {
    setSaving(true); setMsg(null);
    try {
      await save({ data: { articles_db_id: articlesDb, videos_db_id: videosDb, enabled } });
      setMsg("Réglages enregistrés.");
      settingsQ.refetch();
    } catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  async function onTest() {
    setTesting(true); setTestResult(null);
    try {
      const r = await test({ data: { articles_db_id: articlesDb, videos_db_id: videosDb } });
      setTestResult(r);
    } catch (e: any) { setTestResult({ error: e.message }); } finally { setTesting(false); }
  }

  async function onRun() {
    setRunning(true); setMsg(null);
    try {
      const r = await runNow();
      setMsg(`Sync terminée. ${JSON.stringify(r.counts)}`);
      logsQ.refetch(); settingsQ.refetch();
    } catch (e: any) { setMsg(e.message); } finally { setRunning(false); }
  }

  async function onCreateDb() {
    setCreating(true); setMsg(null); setCreatedUrl(null);
    try {
      const r = await createDb({ data: { parent_page: parentPage } });
      setArticlesDb(r.database_id);
      setCreatedUrl(r.url);
      setMsg("Base « Articles — POGI » créée dans Notion avec toutes les colonnes.");
      settingsQ.refetch();
    } catch (e: any) { setMsg(e.message); } finally { setCreating(false); }
  }

  const hasKey = !!settingsQ.data?.hasNotionKey;
  const last = settingsQ.data?.settings?.last_sync_at;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl uppercase">Notion</h1>
        <div className="flex items-center gap-2">
          <button onClick={onRun} disabled={running || !hasKey} className="flex items-center gap-2 bg-pogi-yellow text-pogi-dark font-bold uppercase px-4 py-2 rounded-md disabled:opacity-50">
            {running ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} Synchroniser maintenant
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat icon={<Plug size={18} />} label="Connexion" value={hasKey ? "Connectée" : "Non connectée"} good={hasKey} />
        <Stat icon={<RefreshCw size={18} />} label="Dernière sync" value={last ? new Date(last).toLocaleString("fr-FR") : "Jamais"} />
        <Stat icon={enabled ? <Play size={18} /> : <Pause size={18} />} label="Sync automatique" value={enabled ? "Activée (toutes 15 min)" : "En pause"} good={enabled} />
      </div>

      {/* Settings */}
      <div className="section-card bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-display text-2xl uppercase mb-4">Bases Notion</h2>
        <p className="text-white/60 text-sm mb-4">
          Dans Notion, partage chaque base avec l'intégration <span className="text-pogi-yellow">Lovable</span>, puis copie l'ID de la base ici
          (partie longue de l'URL, ex: <code className="text-white/80">a1b2c3…</code>).
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="ID base Articles"><input className="inp" value={articlesDb} onChange={(e) => setArticlesDb(e.target.value.trim())} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" /></Field>
          <Field label="ID base Vidéos"><input className="inp" value={videosDb} onChange={(e) => setVideosDb(e.target.value.trim())} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" /></Field>
        </div>
        <label className="flex items-center gap-2 mt-4 text-white/80">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Activer la synchronisation automatique (toutes les 15 minutes)
        </label>
        <div className="flex gap-2 mt-4">
          <button onClick={onSave} disabled={saving} className="bg-pogi-yellow text-pogi-dark font-bold uppercase px-5 py-2 rounded-md disabled:opacity-50">
            {saving ? "…" : "Enregistrer"}
          </button>
          <button onClick={onTest} disabled={testing} className="border border-white/20 uppercase px-5 py-2 rounded-md hover:border-pogi-yellow">
            {testing ? "…" : "Tester la connexion"}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-white/80">{msg}</p>}
        {testResult && (
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {(["articles", "videos"] as const).map((k) => {
              const r = testResult[k];
              if (!r) return null;
              return (
                <div key={k} className="border border-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2 font-semibold">
                    {r.ok ? <CheckCircle2 className="text-green-400" size={16} /> : <XCircle className="text-red-400" size={16} />}
                    <span className="uppercase text-sm">{k}</span>
                    {r.title && <span className="text-white/50 text-sm">— {r.title}</span>}
                  </div>
                  {r.ok ? (
                    <ul className="text-xs text-white/60 space-y-0.5 max-h-40 overflow-auto">
                      {r.properties.map((p: any) => <li key={p.name}>· <span className="text-white/80">{p.name}</span> <span className="text-white/40">({p.type})</span></li>)}
                    </ul>
                  ) : <p className="text-red-400 text-sm">{r.message}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sync log */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-display text-2xl uppercase mb-4">Journal de synchronisation</h2>
        {logsQ.isLoading ? <p className="text-white/60">Chargement…</p> : (
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="text-white/50 text-xs uppercase text-left">
                <tr><th className="py-2">Date</th><th>Sens</th><th>Entité</th><th>Action</th><th>Détail</th></tr>
              </thead>
              <tbody>
                {(logsQ.data ?? []).map((l: any) => (
                  <tr key={l.id} className={`border-t border-white/5 ${!l.ok ? "text-red-300" : ""}`}>
                    <td className="py-2 text-white/60 whitespace-nowrap">{new Date(l.run_at).toLocaleString("fr-FR")}</td>
                    <td className="text-white/70">{l.direction}</td>
                    <td className="text-white/70">{l.entity ?? "—"}</td>
                    <td>{l.action}</td>
                    <td className="text-white/60 truncate max-w-[400px]">{l.message ?? (l.details ? JSON.stringify(l.details) : "")}</td>
                  </tr>
                ))}
                {(!logsQ.data || logsQ.data.length === 0) && (
                  <tr><td colSpan={5} className="text-white/50 py-4">Aucune sync pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`.inp{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fff;padding:.5rem .75rem;border-radius:.375rem;outline:none;font-family:monospace;font-size:.85rem}.inp:focus{border-color:#F5C800}`}</style>
    </div>
  );
}

function Stat({ icon, label, value, good }: { icon: React.ReactNode; label: string; value: string; good?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 text-white/60 text-sm">{icon}<span>{label}</span></div>
      <p className={`mt-1 font-semibold ${good ? "text-pogi-yellow" : "text-white"}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm text-white/70 mb-1">{label}</span>{children}</label>;
}
