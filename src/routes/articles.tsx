import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HScroll } from "@/components/HScroll";
import { supabase } from "@/integrations/supabase/client";

import heroRenaissance from "@/assets/hero-renaissance.jpg";
import pVersailles from "@/assets/place-versailles.jpg";
import pLouvre from "@/assets/place-louvre.jpg";
import pOrsay from "@/assets/place-orsay.jpg";
import pGiverny from "@/assets/place-giverny.jpg";
import pCitadelle from "@/assets/place-citadelle.jpg";

export const Route = createFileRoute("/articles")({
  head: () => ({
    meta: [
      { title: "Articles — POGI Histoire" },
      { name: "description", content: "Le Roi et le Génie : les piliers de la Renaissance. Articles d'histoire approfondis." },
      { property: "og:title", content: "Articles — POGI Histoire" },
      { property: "og:description", content: "Articles d'histoire, récits et accompagnements de visite." },
      { property: "og:image", content: heroRenaissance },
    ],
  }),
  component: ArticlesPage,
});

const places = [
  { img: pVersailles, label: "Versailles" },
  { img: pLouvre, label: "Louvres" },
  { img: pOrsay, label: "Orsay" },
  { img: pGiverny, label: "Giverny" },
  { img: pCitadelle, label: "Citadelle" },
];

function ArticlesPage() {
  return (
    <div className="min-h-screen bg-pogi-light">
      <Navbar />

      {/* HERO */}
      <section className="relative h-[70vh] min-h-[520px] w-full overflow-hidden">
        <img src={heroRenaissance} alt="Renaissance" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1280} />
        <div className="absolute inset-0 bg-black/60" />

        <div className="absolute top-6 left-6 flex flex-wrap gap-2">
          <span className="pill">Dernière sortie</span>
          <span className="pill">15min</span>
          <span className="pill">Renaissance</span>
        </div>
        <div className="absolute top-6 right-6">
          <span className="pogi-logo-outline text-3xl">POGI</span>
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] h-full px-6 grid md:grid-cols-[3fr_2fr] gap-8 items-end pb-12">
          <div>
            <h1 className="font-display text-white text-[44px] md:text-[52px] uppercase leading-none">
              Le Roi et le Génie
            </h1>
            <p className="mt-2 italic text-white/90 text-2xl md:text-[32px]">
              Les piliers de la Renaissance
            </p>
          </div>
          <div className="md:pb-2">
            <p className="text-white text-base leading-relaxed mb-6">
              Quand François I<sup>er</sup> accueille Léonard de Vinci à Amboise, ce n'est pas qu'un mécène
              qui reçoit un peintre. C'est une époque qui se rencontre — entre pouvoir et génie, foi et
              raison, France et Italie. Le récit d'une amitié qui scelle la Renaissance française.
            </p>
            <Link
              to="/articles/le-roi-et-le-genie"
              className="inline-block rounded-full border-2 border-white text-white px-8 py-2.5 font-bold tracking-wider hover:bg-white hover:text-pogi-dark transition"
            >
              LIRE
            </Link>
          </div>
        </div>
      </section>

      {/* DERNIERS PUBLIÉS (depuis le back office) */}
      <PublishedArticlesRow />

      {/* PAR CATÉGORIE */}
      <ArticlesByCategory />

      {/* ON VOUS ACCOMPAGNE */}
      <section className="section-pad">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="font-display text-[32px] text-pogi-dark uppercase">On vous accompagne</h2>
          <p className="text-gray-600 text-sm mt-1 mb-6">
            On vous accompagne pendant vos visites de monument, de musée…
          </p>
          <HScroll dark={false}>
            {places.map((p) => (
              <article
                key={p.label}
                className="relative shrink-0 w-[160px] h-[240px] rounded-[16px] overflow-hidden card-hover cursor-pointer"
              >
                <img src={p.img} alt={p.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
                <span
                  className="absolute left-3 bottom-6 font-display text-white text-2xl uppercase tracking-wider"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {p.label}
                </span>
              </article>
            ))}
          </HScroll>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ArticleCard({ a }: { a: any }) {
  return (
    <Link
      to="/articles/$slug"
      params={{ slug: a.slug }}
      className="relative shrink-0 w-[280px] h-[360px] rounded-[16px] overflow-hidden card-hover cursor-pointer bg-pogi-dark block"
    >
      {a.image_url && <img src={a.image_url} alt={a.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 text-white">
        {a.category && <span className="text-xs uppercase tracking-wider text-pogi-yellow">{a.category}</span>}
        <h3 className="font-display text-xl uppercase leading-tight mt-1">{a.title}</h3>
        {a.excerpt && <p className="text-white/80 text-sm mt-1 line-clamp-2">{a.excerpt}</p>}
      </div>
    </Link>
  );
}

function PublishedArticlesRow() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = () => supabase.from("articles").select("id,title,slug,excerpt,image_url,category")
      .eq("published", true).order("published_at", { ascending: false }).limit(12)
      .then(({ data }) => { if (!cancelled) setItems(data ?? []); });
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const ch = supabase.channel("articles-pub")
      .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, load)
      .subscribe();
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); supabase.removeChannel(ch); };
  }, []);
  if (items.length === 0) return null;

  return (
    <section className="section-pad bg-pogi-light">
      <div className="mx-auto max-w-[1400px] px-6">
        <h2 className="font-display text-[32px] text-pogi-dark uppercase mb-5">Derniers publiés</h2>
        <HScroll dark={false}>
          {items.map((a) => <ArticleCard key={a.id} a={a} />)}
        </HScroll>
      </div>
    </section>
  );
}

function ArticlesByCategory() {
  const [cats, setCats] = useState<{ id: string; name: string; sort_order: number }[]>([]);
  const [byCat, setByCat] = useState<Record<string, any[]>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [c, a] = await Promise.all([
        supabase.from("categories").select("id,name,sort_order").order("sort_order"),
        supabase.from("articles").select("id,title,slug,excerpt,image_url,category")
          .eq("published", true).order("published_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const grouped: Record<string, any[]> = {};
      (a.data ?? []).forEach((art: any) => {
        const key = art.category || "Autres";
        (grouped[key] ??= []).push(art);
      });
      setCats((c.data ?? []) as any);
      setByCat(grouped);
    };
    load();
    const ch = supabase.channel("articles-by-cat")
      .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const orderedNames = [
    ...cats.map((c) => c.name).filter((n) => (byCat[n] ?? []).length > 0),
    ...Object.keys(byCat).filter((n) => !cats.some((c) => c.name === n)),
  ];

  if (orderedNames.length === 0) return null;

  return (
    <>
      {orderedNames.map((name) => (
        <section key={name} className="section-pad">
          <div className="mx-auto max-w-[1400px] px-6">
            <h2 className="font-display text-[32px] text-pogi-dark uppercase mb-5">{name}</h2>
            <HScroll dark={false}>
              {byCat[name].map((a) => <ArticleCard key={a.id} a={a} />)}
            </HScroll>
          </div>
        </section>
      ))}
    </>
  );
}

