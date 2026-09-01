import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** Latest health runs, per-target statuses, settings and health alerts. */
export const healthState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: runs }, { data: checks }, { data: settings }, { data: alerts }] =
      await Promise.all([
        supabaseAdmin
          .from("site_health_runs" as any)
          .select("*")
          .order("started_at", { ascending: false })
          .limit(10),
        supabaseAdmin.from("site_health_checks" as any).select("*"),
        supabaseAdmin.from("site_health_settings" as any).select("*").maybeSingle(),
        supabaseAdmin
          .from("seo_alerts" as any)
          .select("*")
          .eq("kind", "health")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
    return {
      runs: (runs as any[]) ?? [],
      checks: (checks as any[]) ?? [],
      settings: (settings as any) ?? null,
      alerts: (alerts as any[]) ?? [],
    };
  });

/** Run the full site health crawl on demand. */
export const healthRunNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { runSiteHealthCheck } = await import("@/lib/health-check.server");
    return runSiteHealthCheck("manual");
  });

/** Diagnose + auto-fix the common site problems, then re-run the crawl. */
export const healthAutoRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { runHealthAutoRepair } = await import("@/lib/health-repair.server");
    return runHealthAutoRepair();
  });


/** Send the daily digest email on demand. */
export const healthSendDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { runDailyHealthSummary } = await import("@/lib/health-check.server");
    return runDailyHealthSummary();
  });

/** Update monitoring settings (recipient, email on/off, monitoring on/off). */
export const healthSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
      enabled?: boolean;
      email_enabled?: boolean;
      daily_summary_enabled?: boolean;
      notify_email?: string;
      monitor_base_url?: string | null;
    }) => {
    if (input.notify_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.notify_email)) {
      throw new Error("Adresse email invalide");
    }
    if (input.monitor_base_url) {
      try {
        const u = new URL(input.monitor_base_url);
        if (!/^https?:$/.test(u.protocol)) throw new Error("bad");
        input.monitor_base_url = u.origin;
      } catch {
        throw new Error("Adresse de site invalide (ex : https://pogi-histoire.com)");
      }
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

    // Changing the monitored address schedules an automatic re-test 30 minutes later.
    let retestAt: string | null = null;
    if (data.monitor_base_url !== undefined) {
      const { data: current } = await supabaseAdmin
        .from("site_health_settings" as any)
        .select("monitor_base_url")
        .maybeSingle();
      const before = (current as any)?.monitor_base_url ?? null;
      if (before !== (data.monitor_base_url ?? null)) {
        retestAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        patch.retest_at = retestAt;
        patch.retest_reason = `Changement d'adresse surveillée (${before ?? "défaut"} → ${data.monitor_base_url ?? "défaut"})`;
      }
    }

    const { error } = await supabaseAdmin
      .from("site_health_settings" as any)
      .update(patch)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true, retestAt };
  });


/** Mark health alerts as read. */
export const healthMarkAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("seo_alerts" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("kind", "health")
      .is("read_at", null);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
