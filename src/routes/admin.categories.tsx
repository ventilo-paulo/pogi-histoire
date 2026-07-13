import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Check, GripVertical, ImageIcon } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });

type Category = { id: string; name: string; slug: string; sort_order: number; image_url: string | null };


function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
}

function AdminCategories() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string; image_url: string | null } | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true); setErr(null);
    const [c, a] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("articles").select("category"),
    ]);
    if (c.error) setErr(c.error.message);
    else setItems((c.data ?? []) as Category[]);
    const counter: Record<string, number> = {};
    (a.data ?? []).forEach((r: any) => { if (r.category) counter[r.category] = (counter[r.category] ?? 0) + 1; });
    setCounts(counter);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true); setErr(null);
    const slug = slugify(name);
    const { error } = await supabase.from("categories").insert({ name, slug, sort_order: (items.length + 1) * 10 });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setNewName("");
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    const name = editing.name.trim();
    const slug = editing.slug.trim() || slugify(name);
    if (!name) return;
    const prev = items.find((i) => i.id === editing.id);
    setErr(null);
    const { error } = await supabase.from("categories").update({ name, slug, image_url: editing.image_url }).eq("id", editing.id);
    if (error) { setErr(error.message); return; }
    // Rename category on articles that referenced the old name
    if (prev && prev.name !== name) {
      await supabase.from("articles").update({ category: name }).eq("category", prev.name);
    }
    setEditing(null);
    load();
  }

  async function del(c: Category) {
    const n = counts[c.name] ?? 0;
    const msg = n > 0
      ? `Supprimer la catégorie "${c.name}" ? ${n} article(s) perdront cette catégorie.`
      : `Supprimer la catégorie "${c.name}" ?`;
    if (!confirm(msg)) return;
    if (n > 0) await supabase.from("articles").update({ category: null }).eq("category", c.name);
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) { setErr(error.message); return; }
    load();
  }

  async function move(c: Category, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === c.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      supabase.from("categories").update({ sort_order: other.sort_order }).eq("id", c.id),
      supabase.from("categories").update({ sort_order: c.sort_order }).eq("id", other.id),
    ]);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl uppercase">Catégories</h1>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
        <p className="text-sm text-white/70 mb-3">Ajouter une catégorie</p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-pogi-yellow"
            placeholder="Ex : Renaissance"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
          <button onClick={add} disabled={busy || !newName.trim()}
            className="flex items-center gap-2 bg-pogi-yellow text-pogi-dark font-bold uppercase text-sm px-4 py-2 rounded-md disabled:opacity-60">
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {err && <p className="text-red-400 mb-4">{err}</p>}
      {loading ? <p className="text-white/60">Chargement…</p> : (
        <div className="space-y-2">
          {items.length === 0 && <p className="text-white/60">Aucune catégorie.</p>}
          {items.map((c, i) => {
            const isEditing = editing?.id === c.id;
            const count = counts[c.name] ?? 0;
            return (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm outline-none focus:border-pogi-yellow"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        placeholder="Nom"
                      />
                      <input
                        className="w-48 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs outline-none focus:border-pogi-yellow font-mono"
                        value={editing.slug}
                        placeholder="slug"
                        onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                      />
                      <button onClick={saveEdit} title="Sauvegarder" className="p-2 text-green-400 hover:text-green-300"><Check size={18} /></button>
                      <button onClick={() => setEditing(null)} title="Annuler" className="p-2 text-white/60 hover:text-white"><X size={18} /></button>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/50 mb-2">Image de la catégorie</p>
                      <ImageUpload
                        value={editing.image_url}
                        onChange={(url) => setEditing({ ...editing, image_url: url })}
                        folder="categories"
                        maxPreviewHeight={220}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-white/30">
                      <button onClick={() => move(c, -1)} disabled={i === 0} className="text-xs hover:text-pogi-yellow disabled:opacity-30">▲</button>
                      <button onClick={() => move(c, 1)} disabled={i === items.length - 1} className="text-xs hover:text-pogi-yellow disabled:opacity-30">▼</button>
                    </div>
                    <GripVertical size={16} className="text-white/20" />
                    <CategoryThumb url={c.image_url} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{c.name}</h3>
                      <p className="text-white/40 text-xs truncate font-mono">/{c.slug}</p>
                    </div>
                    <span className="text-xs uppercase font-bold px-2 py-1 rounded bg-white/10 text-white/70">
                      {count} article{count > 1 ? "s" : ""}
                    </span>
                    <button onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, image_url: c.image_url })}
                      className="p-2 hover:text-pogi-yellow" title="Modifier"><Pencil size={18} /></button>
                    <button onClick={() => del(c)} className="p-2 hover:text-red-400" title="Supprimer"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>

            );
          })}
        </div>
      )}

      <p className="text-xs text-white/40 mt-6">
        Les catégories sont automatiquement disponibles dans le formulaire d'édition des articles et dans le filtre de la page publique.
      </p>
    </div>
  );
}
