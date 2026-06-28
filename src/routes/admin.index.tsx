import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ articles: 0, articlesPub: 0, videos: 0, videosPub: 0 });

  useEffect(() => {
    (async () => {
      const [a, ap, v, vp] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("published", true),
        supabase.from("videos").select("*", { count: "exact", head: true }),
        supabase.from("videos").select("*", { count: "exact", head: true }).eq("published", true),
      ]);
      setStats({
        articles: a.count ?? 0, articlesPub: ap.count ?? 0,
        videos: v.count ?? 0, videosPub: vp.count ?? 0,
      });
    })();
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase mb-6">Tableau de bord</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Articles" total={stats.articles} pub={stats.articlesPub} to="/admin/articles" />
        <Card title="Vidéos" total={stats.videos} pub={stats.videosPub} to="/admin/videos" />
      </div>
    </div>
  );
}

function Card({ title, total, pub, to }: { title: string; total: number; pub: number; to: string }) {
  return (
    <Link to={to} className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:border-pogi-yellow transition">
      <h2 className="font-display text-2xl uppercase">{title}</h2>
      <p className="text-4xl font-bold text-pogi-yellow mt-2">{pub}<span className="text-white/40 text-xl"> / {total}</span></p>
      <p className="text-white/60 text-sm mt-1">publiés / total</p>
    </Link>
  );
}
