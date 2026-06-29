import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import RichTextEditor from "@/components/RichTextEditor";
import { Eye, EyeOff, Pencil, Trash2, Plus, X, Info, Search, Image as ImageIcon, FileText, Save } from "lucide-react";

export const Route = createFileRoute("/admin/articles")({ component: AdminArticles });

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  image_url: string | null;
  author: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  list_text: string | null;
  meta_title: string | null;
  meta_description: string | null;
  indexable: boolean;
  related_article_ids: string[] | null;
};

const empty: Partial<Article> = {
  title: "", slug: "", excerpt: "", content: "", category: "", image_url: "", author: "",
  published: false, list_text: "", meta_title: "", meta_description: "", indexable: true, related_article_ids: [],
};

const TABS = [
  { id: "general", label: "Général", icon: Info },
  { id: "seo", label: "SEO", icon: Search },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "content", label: "Contenu", icon: FileText },
] as const;
type TabId = typeof TABS[number]["id"];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
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
        <ArticleEditor
          initial={editing}
          allArticles={items}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ArticleEditor({
  initial, allArticles, onClose, onSaved,
}: { initial: Partial<Article>; allArticles: Article[]; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<TabId>("general");
  const [a, setA] = useState<Partial<Article>>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // date + time split for the Date de publication field
  const initDate = initial.published_at ? new Date(initial.published_at) : new Date();
  const [pubDate, setPubDate] = useState<string>(initDate.toISOString().slice(0, 10));
  const [pubTime, setPubTime] = useState<string>(initDate.toTimeString().slice(0, 5));

  async function save() {
    setErr(null); setSaving(true);
    try {
      const title = (a.title ?? "").trim();
      if (!title) { setErr("Le titre H1 est requis"); setTab("seo"); return; }
      const slug = (a.slug?.trim() || slugify(title)) || crypto.randomUUID().slice(0, 8);
      const publishedAt = a.published
        ? new Date(`${pubDate}T${pubTime || "10:00"}:00`).toISOString()
        : null;
      const payload: any = {
        title,
        slug,
        list_text: a.list_text || null,
        excerpt: a.list_text || a.excerpt || null, // keep excerpt in sync for legacy reads
        content: a.content ?? "",
        category: a.category || null,
        image_url: a.image_url || null,
        author: a.author || null,
        meta_title: a.meta_title || null,
        meta_description: a.meta_description || null,
        indexable: a.indexable ?? true,
        related_article_ids: a.related_article_ids ?? [],
        published: !!a.published,
        published_at: publishedAt,
      };
      const res = a.id
        ? await supabase.from("articles").update(payload).eq("id", a.id)
        : await supabase.from("articles").insert(payload);
      if (res.error) { setErr(res.error.message); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-stretch p-0 md:p-6">
      <div className="bg-pogi-darker border border-white/10 rounded-none md:rounded-xl w-full max-w-[1100px] mx-auto h-full md:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-xs text-white/50 uppercase tracking-wider">Articles</p>
            <h2 className="font-display text-2xl md:text-3xl uppercase truncate">{a.title || (a.id ? "Modifier l'article" : "Nouvel article")}</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-2"><X size={22} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {tab === "general" && <GeneralTab a={a} setA={setA} allArticles={allArticles} pubDate={pubDate} pubTime={pubTime} setPubDate={setPubDate} setPubTime={setPubTime} />}
          {tab === "seo" && <SeoTab a={a} setA={setA} />}
          {tab === "image" && <ImageTab a={a} setA={setA} />}
          {tab === "content" && <ContentTab a={a} setA={setA} />}
        </div>

        {err && <div className="px-6 py-2 text-sm text-red-300 bg-red-500/10 border-t border-red-500/30">{err}</div>}

        {/* Footer tab bar */}
        <div className="flex items-center justify-between gap-3 px-3 md:px-6 py-3 border-t border-white/10 bg-pogi-dark/60">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap ${active ? "bg-pogi-yellow text-pogi-dark font-semibold" : "text-white/70 hover:bg-white/10"}`}>
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </div>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-pogi-yellow text-pogi-dark font-bold uppercase px-5 py-2 rounded-md disabled:opacity-60">
            <Save size={16} /> {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>
      <style>{`.inp{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fff;padding:.55rem .75rem;border-radius:.5rem;outline:none;font-size:.9rem}.inp:focus{border-color:#F5C800}.section-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:.75rem;padding:1.25rem;margin-bottom:1rem}.section-title{font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:.04em;margin-bottom:1rem;color:#fff}`}</style>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

function FieldRow({ label, hint, children, count }: { label: string; hint?: string; children: React.ReactNode; count?: string }) {
  return (
    <label className="block mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-white/80">{label}</span>
        {count && <span className="text-xs text-white/40">{count}</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-white/40 mt-1">{hint}</p>}
    </label>
  );
}

function GeneralTab({
  a, setA, allArticles, pubDate, pubTime, setPubDate, setPubTime,
}: {
  a: Partial<Article>; setA: (v: Partial<Article>) => void; allArticles: Article[];
  pubDate: string; pubTime: string; setPubDate: (s: string) => void; setPubTime: (s: string) => void;
}) {
  const list = a.list_text ?? "";
  const related = a.related_article_ids ?? [];
  const candidates = useMemo(() => allArticles.filter((x) => x.id !== a.id), [allArticles, a.id]);

  function toggleRelated(id: string) {
    const cur = related;
    if (cur.includes(id)) setA({ ...a, related_article_ids: cur.filter((x) => x !== id) });
    else if (cur.length < 3) setA({ ...a, related_article_ids: [...cur, id] });
  }

  return (
    <div className="section-card">
      <h3 className="section-title">Informations générales</h3>

      <FieldRow label="Texte pour la liste *" count={`${list.length} / 255`}>
        <input className="inp" maxLength={255} value={list}
          onChange={(e) => setA({ ...a, list_text: e.target.value })}
          placeholder="Phrase d'accroche affichée dans les listes d'articles" />
      </FieldRow>

      <FieldRow label="Auteur">
        <input className="inp" value={a.author ?? ""} onChange={(e) => setA({ ...a, author: e.target.value })} placeholder="Nom de l'auteur" />
      </FieldRow>

      <FieldRow label="Continuer la lecture" hint="Sélectionnez jusqu'à 3 articles liés." count={`${related.length} / 3 articles`}>
        <div className="border border-white/10 rounded-lg max-h-44 overflow-auto bg-white/[0.03]">
          {candidates.length === 0 && <p className="px-3 py-2 text-white/40 text-sm">Aucun autre article disponible.</p>}
          {candidates.map((c) => (
            <label key={c.id} className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer">
              <input type="checkbox" checked={related.includes(c.id)}
                disabled={!related.includes(c.id) && related.length >= 3}
                onChange={() => toggleRelated(c.id)} />
              <span className="text-sm">{c.title}</span>
              <span className="ml-auto text-xs text-white/40">{c.category ?? "—"}</span>
            </label>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Catégorie">
        <input className="inp" value={a.category ?? ""} onChange={(e) => setA({ ...a, category: e.target.value })} placeholder="Ex : Le Monde en Guerre" />
      </FieldRow>

      <FieldRow label="Date de publication *">
        <div className="grid grid-cols-[1fr_140px] gap-2">
          <input type="date" className="inp" value={pubDate} onChange={(e) => setPubDate(e.target.value)} />
          <input type="time" className="inp" value={pubTime} onChange={(e) => setPubTime(e.target.value)} />
        </div>
      </FieldRow>
    </div>
  );
}

function SeoTab({ a, setA }: { a: Partial<Article>; setA: (v: Partial<Article>) => void }) {
  const h1 = a.title ?? "";
  const mt = a.meta_title ?? "";
  const md = a.meta_description ?? "";
  const slug = a.slug ?? "";
  return (
    <div className="section-card">
      <h3 className="section-title">SEO</h3>

      <FieldRow label="Titre (H1) *" count={`${h1.length} / 70`}>
        <input className="inp" maxLength={70} value={h1}
          onChange={(e) => setA({ ...a, title: e.target.value, slug: a.slug || slugify(e.target.value) })}
          placeholder="Titre principal de l'article" />
      </FieldRow>

      <FieldRow label="Titre meta *" count={`${mt.length} / 70`}>
        <input className="inp" maxLength={70} value={mt}
          onChange={(e) => setA({ ...a, meta_title: e.target.value })}
          placeholder="Titre affiché dans les résultats Google" />
      </FieldRow>

      <FieldRow label="Description meta *" count={`${md.length} / 160`}>
        <textarea className="inp" maxLength={160} rows={3} value={md}
          onChange={(e) => setA({ ...a, meta_description: e.target.value })}
          placeholder="Résumé affiché sous le titre dans les résultats Google" />
      </FieldRow>

      <FieldRow label="Slug" count={`${slug.length} / 150`}>
        <input className="inp" maxLength={150} value={slug}
          onChange={(e) => setA({ ...a, slug: e.target.value })}
          placeholder="ex: le-roi-et-le-genie" />
      </FieldRow>

      <div className="grid gap-3 mt-2">
        <Toggle label="Contenu publié" checked={!!a.published} onChange={(v) => setA({ ...a, published: v })} />
        <Toggle label="Indexer sur les moteurs" checked={a.indexable !== false} onChange={(v) => setA({ ...a, indexable: v })} />
      </div>
    </div>
  );
}

function ImageTab({ a, setA }: { a: Partial<Article>; setA: (v: Partial<Article>) => void }) {
  return (
    <div className="section-card">
      <h3 className="section-title">Image principale</h3>
      <FieldRow label="URL de l'image" hint="Collez l'URL d'une image hébergée (CDN, Unsplash, etc.).">
        <input className="inp" placeholder="https://…" value={a.image_url ?? ""} onChange={(e) => setA({ ...a, image_url: e.target.value })} />
      </FieldRow>
      {a.image_url ? (
        <div className="mt-3 rounded-lg overflow-hidden border border-white/10 bg-black">
          <img src={a.image_url} alt="" className="w-full max-h-[420px] object-cover" />
        </div>
      ) : (
        <div className="mt-3 border border-dashed border-white/15 rounded-lg p-10 text-center text-white/40">
          Aucune image. Collez une URL ci-dessus pour prévisualiser.
        </div>
      )}
    </div>
  );
}

function ContentTab({ a, setA }: { a: Partial<Article>; setA: (v: Partial<Article>) => void }) {
  return (
    <div className="section-card">
      <h3 className="section-title">Contenu WYSIWYG</h3>
      <RichTextEditor value={a.content ?? ""} onChange={(html) => setA({ ...a, content: html })} />
      <p className="text-xs text-white/40 mt-2">Utilisez la barre d'outils pour mettre en forme le texte : titres, gras, italique, listes, citations, liens, images, vidéos…</p>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className={`relative w-11 h-6 rounded-full transition ${checked ? "bg-pogi-yellow" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 ${checked ? "left-[22px]" : "left-0.5"} w-5 h-5 rounded-full bg-white shadow transition-all`} />
      </span>
      <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-white/85">{label}</span>
    </label>
  );
}
