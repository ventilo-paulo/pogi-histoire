import { Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

/** Branded 404 screen, shared by the catch-all route and the router fallback. */
export function NotFound() {
  return (
    <div className="min-h-screen bg-pogi-dark text-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-lg text-center">
          <p className="text-pogi-yellow uppercase tracking-widest text-xs font-bold mb-4">Erreur 404</p>
          <h1 className="font-display text-7xl md:text-[120px] leading-none">404</h1>
          <h2 className="font-display text-2xl md:text-3xl uppercase mt-4">Page introuvable</h2>
          <p className="text-white/70 mt-4">
            La page que vous cherchez n'existe pas ou a été déplacée.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center rounded-md bg-pogi-yellow px-5 py-2.5 text-sm font-bold uppercase text-pogi-dark transition hover:opacity-90"
            >
              Retour à l'accueil
            </Link>
            <Link
              to="/articles"
              className="inline-flex items-center rounded-md border border-white/20 px-5 py-2.5 text-sm font-bold uppercase text-white transition hover:bg-white/10"
            >
              Voir les articles
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
