import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { Search, X, PlayCircle, FileText, Layers, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COLLECTIONS } from "@/lib/collections";

type ResultArticle = {
  kind: "article";
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string | null;
  image_url: string | null;
};

type ResultVideo = {
  kind: "video";
  id: string;
  title: string;
  slug: string | null;
  subtitle: string | null;
  category: string | null;
  image_url: string | null;
  video_url: string;
};

type ResultCollection = {
  kind: "collection";
  id: string;
  title: string;
  subtitle: string | null;
  category: null;
  image_url: null;
};

type Result = ResultArticle | ResultVideo | ResultCollection;

/** Accent/case-insensitive normalization for local (collections) matching. */
function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


/** Escape PostgREST filter metacharacters so user input can't break out of the filter. */
function sanitize(q: string) {
  return q.replace(/[%,()\\*]/g, " ").trim();
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const term = useMemo(() => sanitize(query), [query]);

  useEffect(() => {
    if (!open) return;
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const pattern = `%${term}%`;
      const [a, v] = await Promise.all([
        supabase
          .from("articles")
          .select("id,title,slug,excerpt,category,image_url")
          .eq("published", true)
          .or(`title.ilike.${pattern},excerpt.ilike.${pattern},category.ilike.${pattern}`)
          .order("published_at", { ascending: false })
          .limit(8),
        supabase
          .from("videos")
          .select("id,title,slug,subtitle,category,thumbnail_url,video_url")
          .eq("published", true)
          .or(`title.ilike.${pattern},subtitle.ilike.${pattern},category.ilike.${pattern}`)
          .order("published_at", { ascending: false })
          .limit(8),
      ]);
      if (cancelled) return;
      const articles: Result[] = (a.data ?? []).map((r) => ({
        kind: "article" as const,
        id: r.id,
        title: r.title,
        slug: r.slug,
        subtitle: r.excerpt,
        category: r.category,
        image_url: r.image_url,
      }));
      const videos: Result[] = (v.data ?? []).map((r) => ({
        kind: "video" as const,
        id: r.id,
        title: r.title,
        slug: r.slug,
        subtitle: r.subtitle,
        category: r.category,
        image_url: r.thumbnail_url,
        video_url: r.video_url,
      }));
      const n = normalize(term);
      const collections: Result[] = COLLECTIONS.filter(
        (c) => normalize(c.title).includes(n) || normalize(c.subtitle).includes(n),
      ).map((c) => ({
        kind: "collection" as const,
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        category: null,
        image_url: null,
      }));
      setResults([...articles, ...videos, ...collections]);

      setLoading(false);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        className="relative w-full max-w-2xl mt-[8vh] rounded-2xl bg-pogi-darker border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search size={20} className="text-white/60 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article, une vidéo…"
            className="min-w-0 flex-1 bg-transparent text-white placeholder:text-white/40 text-base outline-none py-2"
          />
          {loading && <Loader2 size={18} className="animate-spin text-white/50 shrink-0" aria-hidden="true" />}
          <button
            onClick={onClose}
            aria-label="Fermer la recherche"
            className="shrink-0 grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {term.length < 2 ? (
            <p className="px-5 py-8 text-sm text-white/50">Tapez au moins 2 caractères pour lancer la recherche.</p>
          ) : !loading && results.length === 0 ? (
            <p className="px-5 py-8 text-sm text-white/50">Aucun résultat pour « {term} ».</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {results.map((r) => {
                const inner = (
                  <>
                    <div className="relative h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-white/10">
                      {r.image_url && (
                        <img src={r.image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-pogi-yellow">
                        {r.kind === "video" ? <PlayCircle size={12} /> : <FileText size={12} />}
                        {r.kind === "video" ? "Vidéo" : "Article"}
                        {r.category ? ` · ${r.category}` : ""}
                      </span>
                      <p className="truncate text-white font-semibold">{r.title}</p>
                      {r.subtitle && <p className="truncate text-sm text-white/55">{r.subtitle}</p>}
                    </div>
                  </>
                );
                const cls = "flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors";
                return (
                  <li key={`${r.kind}-${r.id}`}>
                    {r.kind === "article" ? (
                      <Link to="/articles/$slug" params={{ slug: r.slug }} onClick={onClose} className={cls}>
                        {inner}
                      </Link>
                    ) : r.slug ? (
                      <Link to="/videos/$slug" params={{ slug: r.slug }} onClick={onClose} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <a href={r.video_url} target="_blank" rel="noreferrer" onClick={onClose} className={cls}>
                        {inner}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
