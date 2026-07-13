import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Pencil, Trash2, Mic } from "lucide-react";

export const Route = createFileRoute("/admin/interviews")({ component: AdminInterviews });

const INTERVIEWS_CAT = "Les voix du passé";

type Row = {
  id: string; title: string; slug: string; excerpt: string | null;
  image_url: string | null; published: boolean; published_at: string | null; created_at: string;
};

function AdminInterviews() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("id,title,slug,excerpt,image_url,published,published_at,created_at")
      .eq("category", INTERVIEWS_CAT)
      .order("created_at", { ascending: false });
    if (error) setErr(error.message); else setItems((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function togglePub(a: Row) {
    const next = !a.published;
    const { error } = await supabase.from("articles")
      .update({ published: next, published_at: next ? (a.published_at ?? new Date().toISOString()) : null })
      .eq("id", a.id);
    if (error) setErr(error.message); else load();
  }

  async function del(a: Row) {
    if (!confirm(`Supprimer "${a.title}" ?`)) return;
    const { error } = await supabase.from("articles").delete().eq("id", a.id);
    if (error) setErr(error.message); else load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl sm:text-4xl uppercase">Interviews</h1>
        <Link to="/admin/articles" className="shrink-0 bg-pogi-yellow text-pogi-dark font-bold uppercase text-sm px-4 py-2 rounded-md">
          Créer un article
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-pogi-yellow/30 bg-pogi-yellow/5 p-4 text-sm text-white/80">
        <p className="font-semibold text-pogi-yellow uppercase text-xs mb-1">Catégorie « Les voix du passé »</p>
        <p>
          Cette page liste les articles rattachés à la catégorie <span className="text-pogi-yellow">« {INTERVIEWS_CAT} »</span>.
          Pour ajouter une interview, créez ou modifiez un article et sélectionnez cette catégorie.
        </p>
      </div>

      {err && <p className="text-red-400 mb-4">{err}</p>}
      {loading ? <p className="text-white/60">Chargement…</p> : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <Mic size={36} className="mx-auto text-pogi-yellow mb-3" />
          <p className="font-display text-xl uppercase">Aucune interview pour le moment</p>
          <p className="text-white/60 mt-2 text-sm">
            Créez un article et assignez-le à la catégorie « {INTERVIEWS_CAT} » pour le voir apparaître ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
              {a.image_url && <img src={a.image_url} alt="" className="w-24 h-14 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{a.title}</h3>
                <p className="text-white/50 text-sm truncate font-mono">/{a.slug}</p>
              </div>
              <span className={`text-xs uppercase font-bold px-2 py-1 rounded ${a.published ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/60"}`}>
                {a.published ? "Publié" : "Brouillon"}
              </span>
              <button onClick={() => togglePub(a)} title={a.published ? "Dépublier" : "Publier"} className="p-2 hover:text-pogi-yellow">
                {a.published ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <Link to="/admin/articles" className="p-2 hover:text-pogi-yellow" title="Modifier dans Articles">
                <Pencil size={18} />
              </Link>
              <button onClick={() => del(a)} className="p-2 hover:text-red-400"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
