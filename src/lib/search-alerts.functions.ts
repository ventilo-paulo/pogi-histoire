import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export type SearchAlertInput = {
  enabled: boolean;
  window_days: number;
  min_searches: number;
  no_results_threshold_pct: number;
  empty_threshold_pct: number;
  email_enabled: boolean;
  notify_email: string | null;
};

/** Réglages actuels des alertes de recherche. */
export const getSearchAlertSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { loadSearchAlertSettings } = await import("@/lib/search-alerts.server");
    return await loadSearchAlertSettings();
  });

/** Enregistre les seuils configurables. */
export const saveSearchAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SearchAlertInput) => ({
    enabled: !!input?.enabled,
    email_enabled: !!input?.email_enabled,
    window_days: clampInt(input?.window_days, 1, 90, 7),
    min_searches: clampInt(input?.min_searches, 1, 10000, 20),
    no_results_threshold_pct: clampInt(input?.no_results_threshold_pct, 1, 100, 25),
    empty_threshold_pct: clampInt(input?.empty_threshold_pct, 1, 100, 50),
    notify_email:
      typeof input?.notify_email === "string" && input.notify_email.trim()
        ? input.notify_email.trim().slice(0, 200)
        : null,
  }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("search_alert_settings" as any)
      .update(data as any)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const, ...data };
  });

/** Évaluation immédiate des seuils (bouton « Vérifier maintenant »). */
export const runSearchAlertCheckNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { runSearchAlertCheck } = await import("@/lib/search-alerts.server");
    return await runSearchAlertCheck("manual");
  });
