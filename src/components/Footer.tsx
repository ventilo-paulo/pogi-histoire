import { Link } from "@tanstack/react-router";
import { Youtube, Mail } from "lucide-react";
import pogiLogo from "@/assets/pogi-logo.png.asset.json";

const navLinks = [
  { to: "/", label: "Accueil" },
  { to: "/videos", label: "Vidéos" },
  { to: "/articles", label: "Articles" },
  { to: "/collections", label: "Collections" },
] as const;

const aboutLinks = [
  { to: "/a-propos", label: "À propos" },
  { href: "mailto:paul.lesaulnier27@gmail.com", label: "Contact" },
] as const;

const YOUTUBE = "https://www.youtube.com/@PogiHistoire";

export function Footer() {
  return (
    <footer className="bg-pogi-darker text-white/80">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link to="/" aria-label="POGI — Accueil" className="inline-flex">
              <img src={pogiLogo.url} alt="POGI Histoire — média indépendant d'histoire" className="h-16 w-auto object-contain" />
            </Link>
            <p className="text-sm text-white/60 leading-relaxed">
              Média indépendant d'histoire — récits documentés, sourcés, vérifiés.
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Navigation">
            <h3 className="text-xs uppercase tracking-widest text-white/80 font-semibold mb-3">Navigation</h3>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm hover:text-pogi-yellow transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* À propos */}
          <nav aria-label="À propos">
            <h3 className="text-xs uppercase tracking-widest text-white/80 font-semibold mb-3">À propos</h3>
            <ul className="space-y-2">
              {aboutLinks.map((l) =>
                "to" in l ? (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm hover:text-pogi-yellow transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ) : (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm hover:text-pogi-yellow transition-colors inline-flex items-center gap-1.5">
                      <Mail size={14} /> {l.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {/* Suivre */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/80 font-semibold mb-3">Suivre</h3>
            <a
              href={YOUTUBE}
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="inline-grid h-11 w-11 place-items-center rounded-xl border border-white/70 text-white hover:bg-white hover:text-pogi-darker transition-colors"
            >
              <Youtube size={20} />
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-xs text-white/70">
          © {new Date().getFullYear()} POGI Histoire — Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
