import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import RichTextEditor from "@/components/RichTextEditor";
import ImageUpload from "@/components/ImageUpload";
import { Eye, EyeOff, Pencil, Trash2, Plus, X, Info, Search, Image as ImageIcon, FileText, Save, Tags, BookOpen } from "lucide-react";

export const Route = createFileRoute("/admin/articles")({ component: AdminArticles });

type Source = { label: string; url?: string };

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
  tags: string[] | null;
  sources: Source[] | null;
};

const empty: Partial<Article> = {
  title: "", slug: "", excerpt: "", content: "", category: "", image_url: "", author: "",
  published: false, list_text: "", meta_title: "", meta_description: "", indexable: true, related_article_ids: [],
  tags: [], sources: [],
};

// Section headers for the single-page editor (icons kept for the visual anchors)
const SECTION_ICONS = { general: Info, seo: Search, image: ImageIcon, content: FileText, meta: Tags } as const;

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
      if (!title) { setErr("Le titre H1 est requis"); return; }
      const slug = (a.slug?.trim() || slugify(title)) || crypto.randomUUID().slice(0, 8);
      const publishedAt = a.published
        ? new Date(`${pubDate}T${pubTime || "10:00"}:00`).toISOString()
        : null;
      const cleanTags = (a.tags ?? [])
        .map((t) => t.trim())
        .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i);
      const cleanSources = (a.sources ?? [])
        .map((s) => ({ label: (s.label ?? "").trim(), url: (s.url ?? "").trim() || undefined }))
        .filter((s) => s.label.length > 0);
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
        tags: cleanTags,
        sources: cleanSources,
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

        {/* Body — single scrollable page with all sections stacked */}
        <div className="flex-1 overflow-auto px-4 md:px-6 py-6 space-y-6">
          <GeneralTab a={a} setA={setA} allArticles={allArticles} pubDate={pubDate} pubTime={pubTime} setPubDate={setPubDate} setPubTime={setPubTime} />
          <SeoTab a={a} setA={setA} />
          <ImageTab a={a} setA={setA} />
          <ContentTab a={a} setA={setA} />
          <MetaTab a={a} setA={setA} />
        </div>

        {err && <div className="px-6 py-2 text-sm text-red-300 bg-red-500/10 border-t border-red-500/30">{err}</div>}

        {/* Footer — single Save button */}
        <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3 border-t border-white/10 bg-pogi-dark/60">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm text-white/70 hover:bg-white/10">Annuler</button>
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

      <FieldRow label="Catégorie" hint="Gérez la liste des catégories ci-dessous.">
        <CategoryPicker value={a.category ?? ""} onChange={(v) => setA({ ...a, category: v })} />
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
      <p className="text-white/50 text-sm mb-3">Importez une image depuis votre ordinateur ou glissez-déposez un fichier.</p>
      <ImageUpload value={a.image_url} onChange={(url) => setA({ ...a, image_url: url })} folder="articles" />
    </div>
  );
}

function ContentTab({ a, setA }: { a: Partial<Article>; setA: (v: Partial<Article>) => void }) {
  type Heading = { tag: "H1" | "H2" | "H3"; text: string; index: number };
  const headings = useMemo<Heading[]>(() => {
    if (typeof window === "undefined") return [];
    const doc = new DOMParser().parseFromString(a.content ?? "", "text/html");
    const counts: Record<string, number> = { H1: 0, H2: 0, H3: 0 };
    const items: Heading[] = [];
    doc.querySelectorAll("h1,h2,h3").forEach((el) => {
      const tag = el.tagName as Heading["tag"];
      const text = (el.textContent || "").trim();
      if (!text) return;
      items.push({ tag, text, index: counts[tag]++ });
    });
    return items;
  }, [a.content]);

  function scrollToHeading(h: Heading) {
    const root = document.getElementById("article-editor-root");
    if (!root) return;
    const els = root.querySelectorAll(h.tag.toLowerCase());
    const el = els[h.index] as HTMLElement | undefined;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const prev = el.style.background;
    el.style.transition = "background 0.6s";
    el.style.background = "rgba(245,200,0,0.28)";
    window.setTimeout(() => { el.style.background = prev; }, 1000);
  }

  return (
    <div className="section-card">
      <h3 className="section-title">Contenu WYSIWYG</h3>
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div id="article-editor-root" className="min-w-0">
          <RichTextEditor value={a.content ?? ""} onChange={(html) => setA({ ...a, content: html })} />
          <p className="text-xs text-white/40 mt-2">Utilisez la barre d'outils pour mettre en forme le texte : titres, gras, italique, listes, citations, liens, images, vidéos…</p>
        </div>
        <aside className="border border-white/10 rounded-lg bg-white/[0.03] p-3 lg:sticky lg:top-2 lg:self-start lg:max-h-[70vh] overflow-auto">
          <div className="flex items-center gap-2 text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
            <BookOpen size={14} /> Sommaire
          </div>
          {headings.length === 0 ? (
            <p className="text-white/40 text-xs">Aucun titre pour le moment. Utilisez H1, H2 ou H3 dans l'éditeur pour construire le plan de l'article.</p>
          ) : (
            <ul className="space-y-0.5">
              {headings.map((h, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => scrollToHeading(h)}
                    title={h.text}
                    className={`block w-full text-left text-sm rounded px-2 py-1 hover:bg-white/10 hover:text-pogi-yellow truncate ${
                      h.tag === "H1" ? "text-white font-semibold"
                      : h.tag === "H2" ? "text-white/85 pl-3"
                      : "text-white/60 pl-6 text-xs"
                    }`}
                  >
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetaTab({ a, setA }: { a: Partial<Article>; setA: (v: Partial<Article>) => void }) {
  const tags = a.tags ?? [];
  const sources = a.sources ?? [];
  const [tagInput, setTagInput] = useState("");

  function addTag(raw: string) {
    const parts = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !tags.includes(t));
    if (parts.length === 0) return;
    setA({ ...a, tags: [...tags, ...parts] });
    setTagInput("");
  }
  function removeTag(t: string) {
    setA({ ...a, tags: tags.filter((x) => x !== t) });
  }
  function addSource() {
    setA({ ...a, sources: [...sources, { label: "", url: "" }] });
  }
  function updateSource(i: number, patch: Partial<Source>) {
    const next = sources.map((s, j) => (i === j ? { ...s, ...patch } : s));
    setA({ ...a, sources: next });
  }
  function removeSource(i: number) {
    setA({ ...a, sources: sources.filter((_, j) => j !== i) });
  }

  return (
    <div>
      <div className="section-card">
        <h3 className="section-title flex items-center gap-2"><Tags size={18} /> Tags</h3>
        <p className="text-white/50 text-xs mb-3">
          Sert à trouver les articles similaires en fin d'article. Séparez par des virgules ou appuyez sur Entrée.
        </p>
        <div className="flex gap-2">
          <input
            className="inp flex-1"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            placeholder="ex: rome antique, jules cesar, gaule"
          />
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            className="px-3 rounded-md bg-white/10 text-sm hover:bg-white/20"
          >
            Ajouter
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-xs uppercase tracking-wider bg-pogi-yellow/20 text-pogi-yellow border border-pogi-yellow/30 px-2 py-1 rounded-full"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="hover:text-white ml-0.5"
                  aria-label={`Retirer ${t}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="section-card">
        <h3 className="section-title flex items-center gap-2"><BookOpen size={18} /> Sources</h3>
        <p className="text-white/50 text-xs mb-3">
          Affichées en fin d'article dans un bloc « Sources ». Le lien est facultatif.
        </p>
        <div className="space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                className="inp"
                placeholder="Titre / référence"
                value={s.label}
                onChange={(e) => updateSource(i, { label: e.target.value })}
              />
              <input
                className="inp"
                placeholder="https://…"
                value={s.url ?? ""}
                onChange={(e) => updateSource(i, { url: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeSource(i)}
                className="px-3 rounded-md bg-white/10 hover:bg-red-500/30 text-red-300"
                aria-label="Supprimer la source"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSource}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm"
          >
            <Plus size={14} /> Ajouter une source
          </button>
        </div>
      </div>
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

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("categories").select("id,name").order("sort_order");
    setCats((data ?? []) as any);
  }
  useEffect(() => { load(); }, []);

  async function addCat() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true); setErr(null);
    const slug = slugify(name);
    const { error } = await supabase.from("categories").insert({ name, slug, sort_order: (cats.length + 1) * 10 });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setNewName(""); setAdding(false);
    await load();
    onChange(name);
  }

  async function removeCat(name: string) {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    const { error } = await supabase.from("categories").delete().eq("name", name);
    if (error) { setErr(error.message); return; }
    if (value === name) onChange("");
    load();
  }

  return (
    <div>
      <div className="flex gap-2">
        <select className="inp flex-1" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Aucune —</option>
          {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <button type="button" onClick={() => setAdding((s) => !s)}
          className="px-3 rounded-md bg-white/10 text-sm hover:bg-white/20">
          {adding ? "Fermer" : "Gérer"}
        </button>
      </div>
      {adding && (
        <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex gap-2 mb-3">
            <input className="inp flex-1" placeholder="Nouvelle catégorie" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCat(); } }} />
            <button type="button" disabled={busy} onClick={addCat}
              className="px-3 rounded-md bg-pogi-yellow text-pogi-dark font-bold text-sm disabled:opacity-60">
              Ajouter
            </button>
          </div>
          {err && <p className="text-red-300 text-xs mb-2">{err}</p>}
          <ul className="space-y-1 max-h-40 overflow-auto">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-white/5">
                <span>{c.name}</span>
                <button type="button" onClick={() => removeCat(c.name)} className="text-red-300 hover:text-red-200 text-xs">Supprimer</button>
              </li>
            ))}
            {cats.length === 0 && <li className="text-white/40 text-sm">Aucune catégorie.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

