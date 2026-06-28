import { Link } from "@tanstack/react-router";
import { Search, User } from "lucide-react";
import pogiLogo from "@/assets/pogi-logo.png";

export function Navbar() {
  const linkBase = "text-base font-medium transition-colors hover:text-pogi-yellow";
  return (
    <header className="sticky top-0 z-50 h-[60px] bg-pogi-darker/90 backdrop-blur-md border-b border-white/5">
      <div className="mx-auto h-full max-w-[1400px] px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="POGI Histoire — Accueil">
          <img src={pogiLogo} alt="POGI" className="h-9 w-auto object-contain" />
          <span className="font-display text-2xl tracking-wide text-white">Histoire</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/videos" className={linkBase} activeProps={{ className: "text-pogi-yellow" }}>
            Vidéos
          </Link>
          <Link to="/articles" className={linkBase} activeProps={{ className: "text-pogi-yellow" }}>
            Articles
          </Link>
          <Link to="/collections" className={linkBase} activeProps={{ className: "text-pogi-yellow" }}>
            Collections
          </Link>
        </nav>
        <div className="flex items-center gap-5 text-white">
          <button aria-label="Recherche" className="hover:text-pogi-yellow transition-colors">
            <Search size={20} />
          </button>
          <a href="#" className="flex items-center gap-2 text-sm font-medium hover:text-pogi-yellow transition-colors">
            <User size={18} />
            <span className="hidden sm:inline">Compte</span>
          </a>
        </div>
      </div>
    </header>
  );
}
