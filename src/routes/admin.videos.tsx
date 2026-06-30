import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Pencil, Trash2, Plus, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export const Route = createFileRoute("/admin/videos")({ component: AdminVideos });

type Video = {
  id: string; title: string; subtitle: string | null; video_url: string;
  thumbnail_url: string | null; format: "court" | "long"; category: string | null;
  published: boolean; published_at: string | null; created_at: string;
};

const empty: Partial<Video> = { title: "", subtitle: "", video_url: "", thumbnail_url: "", format: "court", category: "", published: false };

function AdminVideos() {
  const [items, setItems] = useState<Video[]>([]);
  const [editing, setEditing] = useState<Partial<Video> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (error) setErr(error.message); else setItems((data ?? []) as Video[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    setErr(null);
    const payload: any = {
      title: editing.title?.trim() ?? "",
      subtitle: editing.subtitle || null,
      video_url: editing.video_url?.trim() ?? "",
      thumbnail_url: editing.thumbnail_url || null,
      format: editing.format ?? "court",
      category: editing.category || null,
      published: !!editing.published,
      published_at: editing.published ? (editing.published_at ?? new Date().toISOString()) : null,
    };
    if (!payload.title || !payload.video_url) { setErr("Titre et URL vidéo requis"); return; }
    const res = editing.id
      ? await supabase.from("videos").update(payload).eq("id", editing.id)
      : await supabase.from("videos").insert(payload);
    if (res.error) { setErr(res.error.message); return; }
    setEditing(null); load();
  }

  async function togglePub(v: Video) {
    const next = !v.published;
    const { error } = await supabase.from("videos")
      .update({ published: next, published_at: next ? (v.published_at ?? new Date().toISOString()) : null })
      .eq("id", v.id);
    if (error) setErr(error.message); else load();
  }

  async function del(v: Video) {
    if (!confirm(`Supprimer "${v.title}" ?`)) return;
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) setErr(error.message); else load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl uppercase">Vidéos</h1>
        <button onClick={() => setEditing({ ...empty })} className="flex items-center gap-2 bg-pogi-yellow text-pogi-dark font-bold uppercase px-4 py-2 rounded-md">
          <Plus size={18} /> Nouvelle
        </button>
      </div>

      {err && <p className="text-red-400 mb-4">{err}</p>}
      {loading ? <p className="text-white/60">Chargement…</p> : (
        <div className="space-y-2">
          {items.length === 0 && <p className="text-white/60">Aucune vidéo. Cliquez sur "Nouvelle" pour commencer.</p>}
          {items.map((v) => (
            <div key={v.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
              {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-24 h-14 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{v.title}</h3>
                <p className="text-white/50 text-sm truncate">{v.format === "long" ? "Format long" : "Format court"}{v.category && ` · ${v.category}`}</p>
              </div>
              <span className={`text-xs uppercase font-bold px-2 py-1 rounded ${v.published ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/60"}`}>
                {v.published ? "Publiée" : "Brouillon"}
              </span>
              <button onClick={() => togglePub(v)} title={v.published ? "Dépublier" : "Publier"} className="p-2 hover:text-pogi-yellow">
                {v.published ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button onClick={() => setEditing(v)} className="p-2 hover:text-pogi-yellow"><Pencil size={18} /></button>
              <button onClick={() => del(v)} className="p-2 hover:text-red-400"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Modifier" : "Nouvelle vidéo"}>
          <div className="space-y-3">
            <Field label="Titre *"><input className="inp" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Sous-titre"><input className="inp" value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></Field>
            <Field label="URL vidéo * (YouTube, Vimeo, mp4…)"><input className="inp" placeholder="https://youtube.com/…" value={editing.video_url ?? ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} /></Field>
            <Field label="Miniature"><ImageUpload value={editing.thumbnail_url} onChange={(url) => setEditing({ ...editing, thumbnail_url: url })} folder="videos" maxPreviewHeight={240} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Format">
                <select className="inp" value={editing.format ?? "court"} onChange={(e) => setEditing({ ...editing, format: e.target.value as any })}>
                  <option value="court">Format court</option>
                  <option value="long">Format long</option>
                </select>
              </Field>
              <Field label="Catégorie"><input className="inp" value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-white/80">
              <input type="checkbox" checked={!!editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
              Publier immédiatement
            </label>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-white/70">Annuler</button>
              <button onClick={save} className="bg-pogi-yellow text-pogi-dark font-bold uppercase px-5 py-2 rounded-md">Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm text-white/70 mb-1">{label}</span>{children}</label>;
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-pogi-darker border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-pogi-darker">
          <h2 className="font-display text-2xl uppercase">{title}</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={22} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <style>{`.inp{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fff;padding:.5rem .75rem;border-radius:.375rem;outline:none}.inp:focus{border-color:#F5C800}`}</style>
    </div>
  );
}
