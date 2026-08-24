import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/search-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
          const { runSearchAlertCheck } = await import("@/lib/search-alerts.server");
          const result = await runSearchAlertCheck("cron");
          return Response.json(result, { status: (result as any).ok ? 200 : 500 });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
        }
      },
    },
  },
});
