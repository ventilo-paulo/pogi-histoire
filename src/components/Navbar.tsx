import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import pogiLogo from "@/assets/pogi-logo.png.asset.json";

const links = [
  { to: "/videos", label: "Vidéos" },
  { to: "/interviews", label: "Interviews" },
  { to: "/articles", label: "Articles" },
  { to: "/collections", label: "Collections" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();

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
    "text-base font-medium transition-colors hover:text-pogi-yellow";

  return (
    <header className="sticky top-0 z-50 h-[60px] bg-pogi-darker/90 backdrop-blur-md border-b border-white/5">
      <div className="mx-auto h-full max-w-[1400px] px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0" aria-label="POGI — Accueil">
          <img src={pogiLogo.url} alt="POGI" className="h-9 w-auto object-contain" />
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

      {/* Mobile menu */}
      <div
        className={`md:hidden fixed inset-x-0 top-[60px] bottom-0 bg-pogi-darker/98 backdrop-blur-xl transition-all duration-300 ${
          open
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-2"
        }`}
        aria-hidden={!open}
      >
        <nav className="flex flex-col px-6 py-8 gap-2">
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="text-white text-2xl font-display uppercase tracking-wider py-3 border-b border-white/5 hover:text-pogi-yellow transition-colors"
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
      </div>
    </header>
  );
}
