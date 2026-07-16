import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Copy, Check, Loader2, RefreshCw, Search } from "lucide-react";

export const Route = createFileRoute("/admin/media")({ component: AdminMedia });

const BUCKET = "media";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

type Row = {
  path: string;
  filename: string;
  thumb: string | null;
  credit: string;
  savedCredit: string;
  saving: boolean;
};

async function listAllRecursive(prefix = ""): Promise<{ path: string; filename: string }[]> {
  const out: { path: string; filename: string }[] = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Folders have no id
    if (!("id" in entry) || entry.id === null) {
      const sub = await listAllRecursive(full);
      out.push(...sub);
    } else {
      out.push({ path: full, filename: entry.name });
    }
  }
  return out;
}

function AdminMedia() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setRows(null);
    try {
      const files = await listAllRecursive("");
      // Only images
      const images = files.filter((f) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.filename));
      // Credits
      const { data: credits } = await supabase
        .from("media_credits")
        .select("path,credit");
      const creditMap = new Map<string, string>();
      (credits ?? []).forEach((c) => creditMap.set(c.path, c.credit ?? ""));
      // Signed URLs (batched)
      const paths = images.map((i) => i.path);
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL);
      const urlMap = new Map<string, string>();
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
      });
      const built: Row[] = images.map((i) => {
        const credit = creditMap.get(i.path) ?? "";
        return {
          path: i.path,
          filename: i.filename,
          thumb: urlMap.get(i.path) ?? null,
          credit,
          savedCredit: credit,
          saving: false,
        };
      });
      setRows(built);
    } catch (e: any) {
      setErr(e.message || "Erreur de chargement de la médiathèque.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) => r.filename.toLowerCase().includes(s) || r.path.toLowerCase().includes(s) || r.credit.toLowerCase().includes(s),
    );
  }, [rows, q]);

  async function saveCredit(row: Row) {
    if (row.credit === row.savedCredit) return;
    setRows((prev) => prev?.map((r) => (r.path === row.path ? { ...r, saving: true } : r)) ?? null);
    const payload = { path: row.path, filename: row.filename, credit: row.credit || null };
    const { error } = await supabase.from("media_credits").upsert(payload, { onConflict: "path" });
    setRows((prev) =>
      prev?.map((r) =>
        r.path === row.path
          ? { ...r, saving: false, savedCredit: error ? r.savedCredit : r.credit }
          : r,
      ) ?? null,
    );
    if (error) setErr(error.message);
  }

  async function copyUrl(row: Row) {
    if (!row.thumb) return;
    try {
      await navigator.clipboard.writeText(row.thumb);
      setCopied(row.path);
      setTimeout(() => setCopied((c) => (c === row.path ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl sm:text-4xl uppercase">Médiathèque</h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm px-3 py-2 rounded-md"
        >
          <RefreshCw size={16} /> Rafraîchir
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-pogi-yellow/30 bg-pogi-yellow/5 p-4 text-sm text-white/80">
        <p className="font-semibold text-pogi-yellow uppercase text-xs mb-1">Réutiliser une image existante</p>
        <p>
          Toutes les images déjà uploadées dans le back office (articles, vidéos…) apparaissent ici.
          Cliquez sur <span className="text-pogi-yellow">Copier l'URL</span> puis collez-la dans le champ image d'un article ou d'une vidéo pour la réutiliser
          sans la ré-uploader. Ajoutez le crédit/source de chaque image pour garder une trace des ayants droit.
        </p>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom de fichier ou crédit…"
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:border-pogi-yellow"
        />
      </div>

      {err && <p className="text-red-400 mb-4 text-sm">{err}</p>}

      {filtered === null ? (
        <p className="text-white/60">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <ImageIcon size={36} className="mx-auto text-pogi-yellow mb-3" />
          <p className="font-display text-xl uppercase">Aucune image</p>
          <p className="text-white/60 mt-2 text-sm">
            {q ? "Aucun résultat pour cette recherche." : "Uploadez une image depuis un article ou une vidéo pour la voir apparaître ici."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((row) => (
            <div key={row.path} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-black/40">
                {row.thumb ? (
                  <img src={row.thumb} alt={row.filename} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-white/40">
                    <ImageIcon size={28} />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <p className="text-xs text-white/50 truncate font-mono" title={row.path}>{row.filename}</p>
                <input
                  type="text"
                  placeholder="Crédit / source (ex : Photo © Nom)"
                  value={row.credit}
                  onChange={(e) =>
                    setRows((prev) => prev?.map((r) => (r.path === row.path ? { ...r, credit: e.target.value } : r)) ?? null)
                  }
                  onBlur={() => saveCredit(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                  }}
                  className="w-full px-2 py-1.5 text-sm bg-white/5 border border-white/10 rounded text-white placeholder:text-white/30 focus:outline-none focus:border-pogi-yellow"
                />
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  <span className="text-xs text-white/40 h-4">
                    {row.saving ? (
                      <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Enregistrement…</span>
                    ) : row.credit !== row.savedCredit ? (
                      <span className="text-pogi-yellow">Non sauvegardé</span>
                    ) : row.savedCredit ? (
                      <span>Crédit enregistré</span>
                    ) : null}
                  </span>
                  <button
                    onClick={() => copyUrl(row)}
                    disabled={!row.thumb}
                    className="inline-flex items-center gap-1.5 text-xs bg-pogi-yellow text-pogi-dark font-bold uppercase tracking-wider px-2.5 py-1.5 rounded hover:bg-pogi-yellow/90 disabled:opacity-40"
                  >
                    {copied === row.path ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier l'URL</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
