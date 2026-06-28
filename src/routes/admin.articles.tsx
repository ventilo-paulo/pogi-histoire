import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Pencil, Trash2, Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin/articles")({ component: AdminArticles });

type Article = {
  id: string; title: string; slug: string; excerpt: string | null; content: string;
  category: string | null; image_url: string | null; author: string | null;
  published: boolean; published_at: string | null; created_at: string;
};

const empty: Partial<Article> = { title: "", slug: "", excerpt: "", content: "", category: "", image_url: "", author: "", published: false };

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function AdminArticles() {
  const [items, setItems] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (error) setErr(error.message); else setItems((data ?? []) as Article[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    setErr(null);
    const payload: any = {
      title: editing.title?.trim() ?? "",
      slug: (editing.slug?.trim() || slugify(editing.title ?? "")) || crypto.randomUUID().slice(0, 8),
      excerpt: editing.excerpt || null,
      content: editing.content ?? "",
      category: editing.category || null,
      image_url: editing.image_url || null,
      author: editing.author || null,
      published: !!editing.published,
      published_at: editing.published ? (editing.published_at ?? new Date().toISOString()) : null,
    };
    if (!payload.title) { setErr("Titre requis"); return; }
    const res = editing.id
      ? await supabase.from("articles").update(payload).eq("id", editing.id)
      : await supabase.from("articles").insert(payload);
    if (res.error) { setErr(res.error.message); return; }
    setEditing(null); load();
  }

  async function togglePub(a: Article) {
    const next = !a.published;
    const { error } = await supabase.from("articles")
      .update({ published: next, published_at: next ? (a.published_at ?? new Date().toISOString()) : null })
      .eq("id", a.id);
    if (error) setErr(error.message); else load();
  }

  async function del(a: Article) {
    if (!confirm(`Supprimer "${a.title}" ?`)) return;
    const { error } = await supabase.from("articles").delete().eq("id", a.id);
    if (error) setErr(error.message); else load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl uppercase">Articles</h1>
        <button onClick={() => setEditing({ ...empty })} className="flex items-center gap-2 bg-pogi-yellow text-pogi-dark font-bold uppercase px-4 py-2 rounded-md">
          <Plus size={18} /> Nouveau
        </button>
      </div>

      {err && <p className="text-red-400 mb-4">{err}</p>}
      {loading ? <p className="text-white/60">Chargement…</p> : (
        <div className="space-y-2">
          {items.length === 0 && <p className="text-white/60">Aucun article. Cliquez sur "Nouveau" pour commencer.</p>}
          {items.map((a) => (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
              {a.image_url && <img src={a.image_url} alt="" className="w-16 h-16 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{a.title}</h3>
                <p className="text-white/50 text-sm truncate">/{a.slug} {a.category && `· ${a.category}`}</p>
              </div>
              <span className={`text-xs uppercase font-bold px-2 py-1 rounded ${a.published ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/60"}`}>
                {a.published ? "Publié" : "Brouillon"}
              </span>
              <button onClick={() => togglePub(a)} title={a.published ? "Dépublier" : "Publier"} className="p-2 hover:text-pogi-yellow">
                {a.published ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button onClick={() => setEditing(a)} className="p-2 hover:text-pogi-yellow"><Pencil size={18} /></button>
              <button onClick={() => del(a)} className="p-2 hover:text-red-400"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Modifier" : "Nouvel article"}>
          <div className="space-y-3">
            <Field label="Titre *"><input className="inp" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })} /></Field>
            <Field label="Slug (URL)"><input className="inp" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie"><input className="inp" value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
              <Field label="Auteur"><input className="inp" value={editing.author ?? ""} onChange={(e) => setEditing({ ...editing, author: e.target.value })} /></Field>
            </div>
            <Field label="URL image de couverture"><input className="inp" placeholder="https://…" value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></Field>
            <Field label="Extrait"><textarea className="inp" rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} /></Field>
            <Field label="Contenu (markdown / texte libre)"><textarea className="inp font-mono text-sm" rows={10} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></Field>
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
