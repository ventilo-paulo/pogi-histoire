import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import pogiLogo from "@/assets/pogi-logo.png.asset.json";
import { publishedArticlesStore, INTERVIEWS_CATEGORY } from "@/lib/realtime-stores";

const ALL_LINKS = [
  { to: "/videos", label: "Vidéos" },
  { to: "/interviews", label: "Interviews", requiresInterviews: true },
  { to: "/articles", label: "Articles" },
  { to: "/collections", label: "Collections" },
] as const;


export function Navbar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { location } = useRouterState();
  const articles = useSyncExternalStore(
    publishedArticlesStore.subscribe,
    publishedArticlesStore.getSnapshot,
    publishedArticlesStore.getSnapshot,
  );
  const hasInterviews = useMemo(
    () => (articles ?? []).some((a) => a.category === INTERVIEWS_CATEGORY),
    [articles],
  );
  const links = useMemo(
    () => ALL_LINKS.filter((l) => !("requiresInterviews" in l && l.requiresInterviews) || hasInterviews),
    [hasInterviews],
  );

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock scroll while menu open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);


  const linkBase =
    "text-base font-semibold text-white transition-colors hover:text-pogi-yellow hover:underline underline-offset-8 decoration-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]";

  return (
    <header className="sticky top-0 z-50 h-[76px] bg-pogi-darker/95 backdrop-blur-md border-b border-white/10 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
      <div className="mx-auto h-full max-w-[1400px] px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0" aria-label="POGI — Accueil">
          <img src={pogiLogo.url} alt="POGI Histoire — média indépendant d'histoire" className="h-14 w-auto object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={linkBase}
              activeProps={{ className: "text-pogi-yellow" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-white">
          <Link
            to="/articles"
            aria-label="Rechercher un article"
            title="Rechercher"
            className="hidden sm:inline-flex hover:text-pogi-yellow transition-colors p-2"
          >
            <Search size={20} />
          </Link>

          <button
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu — portaled to body to escape header's backdrop-filter containing block */}
      {mounted &&
        createPortal(
          <div
            className="md:hidden fixed inset-0 z-[100] bg-pogi-darker overflow-y-auto"
            aria-hidden={!open}
            style={{
              paddingTop: 76,
              display: open ? "block" : "none",
            }}
          >
            <nav className="flex flex-col px-6 py-8 gap-2">
              {links.map((l, i) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="text-white text-2xl font-display uppercase tracking-wider py-4 border-b border-white/10 hover:text-pogi-yellow transition-colors active:bg-white/5 -mx-6 px-6"
                  activeProps={{ className: "text-pogi-yellow" }}
                  style={{
                    animation: open
                      ? `pogi-page-in 0.35s ${0.05 * i + 0.05}s cubic-bezier(0.22, 1, 0.36, 1) both`
                      : undefined,
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>,
          document.body,
        )}
    </header>
  );
}
