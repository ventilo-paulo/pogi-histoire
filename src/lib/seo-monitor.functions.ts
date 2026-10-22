import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** Latest automated run, persisted URL statuses and unread alerts. */
export const seoMonitorState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: runs }, { data: statuses }, { data: alerts }] = await Promise.all([
      supabaseAdmin
        .from("seo_index_runs" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10),
      supabaseAdmin.from("seo_url_status" as any).select("*"),
      supabaseAdmin
        .from("seo_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return {
      runs: (runs as any[]) ?? [],
      statuses: (statuses as any[]) ?? [],
      alerts: (alerts as any[]) ?? [],
    };
  });

/** Run the full sitemap + URL check on demand (same code path as the cron). */
export const seoRunCheckNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { runSeoIndexCheck } = await import("@/lib/seo-check.server");
    return runSeoIndexCheck("manual");
  });

/** Mark alerts as read (all, or a single one). */
export const seoMarkAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("seo_alerts" as any)
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Per-query Google position history (stored snapshots). */
export const seoRankState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { getQueryRankSummary } = await import("@/lib/seo-rank.server");
    return getQueryRankSummary(150);
  });

/** Pull fresh Search Console query data and store it. */
export const seoRefreshRanks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { refreshQueryRanks } = await import("@/lib/seo-rank.server");
    return refreshQueryRanks(28);
  });

/** Stored Google Search indicators (clicks, impressions, queries, pages). */
export const seoSearchPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) => {
    const days = Number(input?.days ?? 28);
    return { days: [7, 28, 90].includes(days) ? days : 28 };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { getSearchPerformance } = await import("@/lib/seo-rank.server");
    return getSearchPerformance(data.days);
  });

/** Fetch fresh numbers from Google Search Console and store them. */
export const seoRefreshSearchPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { refreshQueryRanks, refreshSearchPerformance } = await import("@/lib/seo-rank.server");
    try {
      await refreshQueryRanks(60);
      const r = await refreshSearchPerformance(90);
      return { ok: true as const, capturedAt: r.capturedAt, days: r.days };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      if (message.includes("Aucune propriété")) {
        return {
          ok: false as const,
          error:
            "Google Search Console n'a pas encore confirmé que pogi-histoire.com vous appartient. Les chiffres apparaîtront dès que ce sera fait.",
        };
      }
      return { ok: false as const, error: message };
    }
  });
