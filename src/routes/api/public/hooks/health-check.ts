import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/health-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let mode = "check";
        try {
          const body = (await request.clone().json()) as { mode?: string };
          if (body?.mode) mode = body.mode;
        } catch {
          /* empty body */
        }
        const provided =
          request.headers.get("x-webhook-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        const candidates: string[] = [];
        if (process.env.SEO_CRON_SECRET) candidates.push(process.env.SEO_CRON_SECRET);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .schema("vault" as any)
            .from("decrypted_secrets" as any)
            .select("decrypted_secret")
            .eq("name", "seo_cron_secret")
            .maybeSingle();
          const v = (data as any)?.decrypted_secret;
          if (v) candidates.push(v);
        } catch {
          /* vault unavailable — fall back to env */
        }

        if (!candidates.length) {
          return Response.json({ ok: false, error: "Cron secret not configured" }, { status: 503 });
        }

        const enc = new TextEncoder();
        const a = enc.encode(provided);
        const match = candidates.some((c) => {
          const b = enc.encode(c);
          if (a.length !== b.length) return false;
          let diff = 0;
          for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
          return diff === 0;
        });
        if (!match) return new Response("Unauthorized", { status: 401 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: settings } = await supabaseAdmin
            .from("site_health_settings" as any)
            .select("enabled, retest_at")
            .maybeSingle();
          if ((settings as any) && (settings as any).enabled === false) {
            return Response.json({ ok: true, skipped: "disabled" });
          }
          if (mode === "retest") {
            const due = (settings as any)?.retest_at as string | null | undefined;
            if (!due || new Date(due).getTime() > Date.now()) {
              return Response.json({ ok: true, skipped: "no-retest-due" });
            }
            await supabaseAdmin
              .from("site_health_settings" as any)
              .update({ retest_at: null, retest_reason: null })
              .eq("id", true);
            const { runSiteHealthCheck } = await import("@/lib/health-check.server");
            return Response.json(await runSiteHealthCheck("cron"), { status: 200 });
          }
          if (mode === "daily-summary") {
            const { runDailyHealthSummary } = await import("@/lib/health-check.server");
            return Response.json(await runDailyHealthSummary(), { status: 200 });
          }
          const { runSiteHealthCheck } = await import("@/lib/health-check.server");
          const result = await runSiteHealthCheck("cron");
          return Response.json(result, { status: 200 });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
        }

      },
    },
  },
});
