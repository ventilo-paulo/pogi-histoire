import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import pogiLogo from "@/assets/pogi-logo.png.asset.json";
import { LogOut, FileText, Video, LayoutDashboard, Database, Tag, Mic } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — POGI", name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      setEmail(session.user.email ?? "");
      const { data, error } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (cancelled) return;
      if (error || !data) setStatus("denied");
      else setStatus("ok");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-pogi-darker grid place-items-center text-white/70">Chargement…</div>;
  }
  if (status === "denied") {
    return (
      <div className="min-h-screen bg-pogi-darker grid place-items-center text-center px-4">
        <div>
          <h1 className="font-display text-3xl text-white uppercase mb-2">Accès refusé</h1>
          <p className="text-white/70 mb-6">Ce compte ({email}) n'a pas les droits administrateur.<br />Le back office est réservé à <span className="text-pogi-yellow">pogi.videos@gmail.com</span>.</p>
          <button onClick={signOut} className="bg-pogi-yellow text-pogi-dark font-bold uppercase px-6 py-2 rounded-md">Se déconnecter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pogi-darker text-white">
      <header className="h-[60px] border-b border-white/10 flex items-center justify-between px-6 sticky top-0 bg-pogi-darker/95 backdrop-blur z-40">
        <Link to="/admin" className="flex items-center gap-3">
          <img src={pogiLogo.url} alt="POGI" className="h-8 w-auto" />
          <span className="font-display uppercase tracking-wider text-pogi-yellow">Back office</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/60 text-sm hover:text-pogi-yellow">Voir le site →</Link>
          <button onClick={signOut} className="flex items-center gap-2 text-sm text-white/70 hover:text-pogi-yellow">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] grid md:grid-cols-[220px_1fr] gap-8 px-6 py-8">
        <aside className="space-y-1">
          <NavItem to="/admin" icon={<LayoutDashboard size={18} />} label="Tableau de bord" exact />
          <NavItem to="/admin/articles" icon={<FileText size={18} />} label="Articles" />
          <NavItem to="/admin/categories" icon={<Tag size={18} />} label="Catégories" />
          <NavItem to="/admin/videos" icon={<Video size={18} />} label="Vidéos" />
          <NavItem to="/admin/interviews" icon={<Mic size={18} />} label="Interviews" />
          <NavItem to="/admin/notion" icon={<Database size={18} />} label="Notion" />
        </aside>
        <main><Outlet /></main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  return (
    <Link to={to} activeOptions={{ exact }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white"
      activeProps={{ className: "flex items-center gap-3 px-3 py-2.5 rounded-md bg-pogi-yellow/10 text-pogi-yellow" }}>
      {icon}<span>{label}</span>
    </Link>
  );
}
