import { createServerFn } from "@tanstack/react-start";

/**
 * Public, read-only status summary: only aggregate counts and the last run
 * outcome — no URLs, no error details, no settings.
 */
export const publicStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: runs }, { data: checks }] = await Promise.all([
    supabaseAdmin
      .from("site_health_runs" as any)
      .select("started_at,finished_at,ok,checks_total,checks_failed")
      .order("started_at", { ascending: false })
      .limit(12),
    supabaseAdmin.from("site_health_checks" as any).select("kind,status"),
  ]);

  const rows = (checks as any[]) ?? [];
  const byKind = new Map<string, { total: number; failed: number }>();
  for (const c of rows) {
    const label =
      c.kind === "page" ? "Pages" : c.kind === "image" ? "Images" : c.kind === "asset" ? "Ressources" : "Autres";
    const entry = byKind.get(label) ?? { total: 0, failed: 0 };
    entry.total++;
    if (c.status === "fail") entry.failed++;
    byKind.set(label, entry);
  }

  const allRuns = (runs as any[]) ?? [];
  const last = allRuns[0] ?? null;
  const total = rows.length;
  const failed = rows.filter((c) => c.status === "fail").length;

  return {
    operational: total > 0 ? failed === 0 : !!last?.ok,
    total,
    failed,
    groups: [...byKind.entries()].map(([label, v]) => ({ label, ...v })),
    lastRun: last
      ? {
          startedAt: last.started_at as string,
          ok: !!last.ok,
          total: last.checks_total ?? 0,
          failed: last.checks_failed ?? 0,
        }
      : null,
    history: allRuns.map((r) => ({
      startedAt: r.started_at as string,
      ok: !!r.ok,
      failed: r.checks_failed ?? 0,
    })),
    checkedAt: new Date().toISOString(),
  };
});
