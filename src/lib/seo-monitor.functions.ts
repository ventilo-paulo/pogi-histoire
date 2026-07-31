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
