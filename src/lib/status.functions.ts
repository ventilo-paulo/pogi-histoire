import { createServerFn } from "@tanstack/react-start";

/** Public, read-only site status: current state, recent incidents, check history. */
export const publicSiteStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: checks }, { data: runs }, { data: alerts }] = await Promise.all([
    supabaseAdmin.from("site_health_checks" as any).select("target,kind,label,status,failing_since,checked_at"),
    supabaseAdmin
      .from("site_health_runs" as any)
      .select("id,started_at,finished_at,ok,checks_total,checks_ok,checks_failed")
      .order("started_at", { ascending: false })
      .limit(12),
    supabaseAdmin
      .from("seo_alerts" as any)
      .select("id,created_at,level,title,target")
      .eq("kind", "health")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const all = ((checks as any[]) ?? []).map((c) => ({
    target: c.target as string,
    kind: c.kind as string,
    label: c.label as string,
    status: c.status as string,
    failing_since: c.failing_since as string | null,
    checked_at: c.checked_at as string,
  }));

  const failing = all.filter((c) => c.status === "fail");

  return {
    total: all.length,
    okCount: all.length - failing.length,
    failing,
    lastRun: ((runs as any[]) ?? [])[0] ?? null,
    runs: (runs as any[]) ?? [],
    incidents: (alerts as any[]) ?? [],
  };
});
