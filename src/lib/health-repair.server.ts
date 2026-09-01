import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL } from "@/lib/site";

export type RepairStep = {
  id: string;
  label: string;
  status: "fixed" | "ok" | "skipped" | "failed";
  detail: string;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function probeOrigin(origin: string) {
  try {
    const res = await fetch(`${origin}/`, {
      redirect: "follow",
      headers: { "User-Agent": "pogi-health-repair/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    return { ok: res.ok, status: res.status, finalOrigin: new URL(res.url).origin };
  } catch (e) {
    return { ok: false, status: 0, finalOrigin: origin, error: (e as Error).message };
  }
}

/**
 * Diagnose the most common site issues and fix what can safely be fixed
 * automatically, then re-run the full health crawl.
 */
export async function runHealthAutoRepair() {
  const steps: RepairStep[] = [];

  // --- 1. Monitored address: make sure we watch an origin that actually answers.
  const { data: settings } = await supabaseAdmin
    .from("site_health_settings" as any)
    .select("monitor_base_url")
    .maybeSingle();
  const configured = ((settings as any)?.monitor_base_url as string | null) || SITE_URL;
  let activeBase = configured.replace(/\/$/, "");

  const candidates = Array.from(
    new Set([activeBase, SITE_URL.replace(/\/$/, ""), "https://pogi-histoire.lovable.app"]),
  );
  let picked: string | null = null;
  let pickedDetail = "";
  for (const c of candidates) {
    const r = await probeOrigin(c);
    if (r.ok) {
      picked = r.finalOrigin;
      pickedDetail = `HTTP ${r.status} sur ${r.finalOrigin}`;
      break;
    }
    if (!pickedDetail) pickedDetail = `${c} → ${r.status || "injoignable"}`;
  }

  if (!picked) {
    steps.push({
      id: "monitor",
      label: "Adresse surveillée",
      status: "failed",
      detail: `Aucune adresse ne répond (${pickedDetail}). Vérifie le domaine et sa configuration DNS.`,
    });
  } else if (picked !== activeBase) {
    const { error } = await supabaseAdmin
      .from("site_health_settings" as any)
      .update({
        monitor_base_url: picked,
        retest_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        retest_reason: "Réparation automatique : adresse surveillée corrigée",
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) {
      steps.push({ id: "monitor", label: "Adresse surveillée", status: "failed", detail: error.message });
    } else {
      activeBase = picked;
      steps.push({
        id: "monitor",
        label: "Adresse surveillée",
        status: "fixed",
        detail: `Basculée sur ${picked} (l'ancienne adresse ne répondait pas correctement).`,
      });
    }
  } else {
    steps.push({
      id: "monitor",
      label: "Adresse surveillée",
      status: "ok",
      detail: `${activeBase} répond normalement (${pickedDetail}).`,
    });
  }

  // --- 2. Purge check rows pointing at an origin we no longer watch.
  const { data: rows } = await supabaseAdmin
    .from("site_health_checks" as any)
    .select("target");
  const stale = ((rows as any[]) ?? [])
    .map((r) => r.target as string)
    .filter((t) => /^https?:\/\//i.test(t) && !t.startsWith(activeBase));
  if (stale.length) {
    await supabaseAdmin.from("site_health_checks" as any).delete().in("target", stale);
    steps.push({
      id: "stale",
      label: "Anciens résultats",
      status: "fixed",
      detail: `${stale.length} contrôle(s) obsolète(s) supprimé(s).`,
    });
  } else {
    steps.push({ id: "stale", label: "Anciens résultats", status: "ok", detail: "Aucun résidu à nettoyer." });
  }

  // --- 3. Published content without a slug produces dead links.
  let fixedSlugs = 0;
  for (const table of ["articles", "videos"] as const) {
    const { data: items } = await supabaseAdmin
      .from(table as any)
      .select("id,title,slug")
      .eq("published", true);
    for (const it of ((items as any[]) ?? []).filter((i) => !i.slug || !String(i.slug).trim())) {
      const slug = slugify(it.title || "") || String(it.id).slice(0, 8);
      const { error } = await supabaseAdmin
        .from(table as any)
        .update({ slug })
        .eq("id", it.id);
      if (!error) fixedSlugs++;
    }
  }
  steps.push({
    id: "slugs",
    label: "Liens des contenus publiés",
    status: fixedSlugs ? "fixed" : "ok",
    detail: fixedSlugs
      ? `${fixedSlugs} contenu(s) publié(s) sans adresse ont reçu un lien valide.`
      : "Tous les contenus publiés ont un lien valide.",
  });

  // --- 4. Re-run the full crawl with the repaired configuration.
  let result: any = null;
  try {
    const { runSiteHealthCheck } = await import("@/lib/health-check.server");
    result = await runSiteHealthCheck("manual");
    const failed = result?.checks_failed ?? result?.failed ?? 0;
    steps.push({
      id: "recheck",
      label: "Nouveau contrôle santé",
      status: failed ? "failed" : "fixed",
      detail: failed
        ? `${failed} contrôle(s) encore en échec — voir le détail ci-dessous.`
        : "Tous les contrôles sont au vert.",
    });
  } catch (e) {
    steps.push({
      id: "recheck",
      label: "Nouveau contrôle santé",
      status: "failed",
      detail: (e as Error).message,
    });
  }

  // --- 5. Close health alerts whose target is now healthy.
  const { data: healthy } = await supabaseAdmin
    .from("site_health_checks" as any)
    .select("target,status");
  const okTargets = ((healthy as any[]) ?? [])
    .filter((c) => c.status === "ok")
    .map((c) => c.target as string);
  let closed = 0;
  if (okTargets.length) {
    const { data: upd } = await supabaseAdmin
      .from("seo_alerts" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("kind", "health")
      .is("read_at", null)
      .in("target", okTargets)
      .select("id");
    closed = ((upd as any[]) ?? []).length;
  }
  steps.push({
    id: "alerts",
    label: "Alertes résolues",
    status: closed ? "fixed" : "ok",
    detail: closed ? `${closed} alerte(s) résolue(s) archivée(s).` : "Aucune alerte obsolète.",
  });

  const remaining = ((healthy as any[]) ?? []).filter((c) => c.status !== "ok");
  return {
    steps,
    fixed: steps.filter((s) => s.status === "fixed").length,
    remaining: remaining.map((c: any) => ({ target: c.target, status: c.status })),
    run: result ?? null,
  };
}
