import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import pogiLogo from "@/assets/pogi-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — POGI Histoire" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        setInfo("Compte créé. Vous pouvez maintenant vous connecter.");
        setMode("signin");
      }
    } catch (err: any) {
      setError(err.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-pogi-darker flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-black/40 border border-white/10 rounded-2xl p-8">
        <div className="flex justify-center mb-6">
          <img src={pogiLogo.url} alt="POGI" className="h-14 w-auto" />
        </div>
        <h1 className="font-display text-3xl text-white text-center uppercase mb-1">Back office</h1>
        <p className="text-white/60 text-center text-sm mb-6">Accès réservé à l'équipe POGI</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 focus:outline-none focus:border-pogi-yellow" />
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-1">Mot de passe</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 focus:outline-none focus:border-pogi-yellow" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {info && <p className="text-green-400 text-sm">{info}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-pogi-yellow text-pogi-dark font-bold uppercase tracking-wider py-2.5 rounded-md hover:bg-pogi-yellow/90 disabled:opacity-50">
            {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
          className="block mx-auto mt-4 text-white/60 text-sm hover:text-pogi-yellow">
          {mode === "signin" ? "Première connexion ? Créer le compte" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
