import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Historique (contrôles santé, indexation, incidents) sur une plage de dates. */
export const supervisionExportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => {
    if (!isDate(input?.from) || !isDate(input?.to)) throw new Error("Plage de dates invalide");
    if (input.from > input.to) throw new Error("La date de début doit précéder la date de fin");
    return { from: input.from, to: input.to };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = new Date(`${data.from}T00:00:00.000Z`).toISOString();
    const end = new Date(`${data.to}T23:59:59.999Z`).toISOString();

    const [{ data: healthRuns }, { data: seoRuns }, { data: alerts }] = await Promise.all([
      supabaseAdmin
        .from("site_health_runs" as any)
        .select("*")
        .gte("started_at", start)
        .lte("started_at", end)
        .order("started_at", { ascending: false })
        .limit(2000),
      supabaseAdmin
        .from("seo_index_runs" as any)
        .select("*")
        .gte("started_at", start)
        .lte("started_at", end)
        .order("started_at", { ascending: false })
        .limit(2000),
      supabaseAdmin
        .from("seo_alerts" as any)
        .select("*")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    return {
      from: data.from,
      to: data.to,
      healthRuns: (healthRuns as any[]) ?? [],
      seoRuns: (seoRuns as any[]) ?? [],
      alerts: (alerts as any[]) ?? [],
    };
  });

/** Relance immédiate d'un contrôle (santé ou indexation). */
export const supervisionRunStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { step: "health" | "seo" }) => {
    if (input?.step !== "health" && input?.step !== "seo") throw new Error("Étape inconnue");
    return { step: input.step };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    if (data.step === "health") {
      const { runSiteHealthCheck } = await import("@/lib/health-check.server");
      const r: any = await runSiteHealthCheck("manual");
      return {
        step: "health" as const,
        ok: !!r?.ok,
        total: r?.total ?? 0,
        failed: r?.failed ?? 0,
        recovered: r?.recovered ?? 0,
      };
    }
    const { runSeoIndexCheck } = await import("@/lib/seo-check.server");
    const r: any = await runSeoIndexCheck("manual");
    return {
      step: "seo" as const,
      ok: !!r?.ok,
      total: r?.urlsTotal ?? r?.urls_total ?? r?.total ?? 0,
      failed: r?.urlsError ?? r?.urls_error ?? 0,
      recovered: r?.urlsIndexed ?? r?.urls_indexed ?? 0,
    };
  });
