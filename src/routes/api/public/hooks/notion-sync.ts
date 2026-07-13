import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/notion-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided =
          request.headers.get("x-webhook-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        // Accept either the env-based secret or a secret stored in Supabase Vault
        // (the vault-backed secret is what the pg_cron job sends, so the sync
        // works out of the box without exposing NOTION_WEBHOOK_SECRET to Postgres).
        const candidates: string[] = [];
        if (process.env.NOTION_WEBHOOK_SECRET) candidates.push(process.env.NOTION_WEBHOOK_SECRET);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .schema("vault" as any)
            .from("decrypted_secrets" as any)
            .select("decrypted_secret")
            .eq("name", "notion_webhook_secret")
            .maybeSingle();
          const v = (data as any)?.decrypted_secret;
          if (v) candidates.push(v);
        } catch { /* vault not available — fall back to env */ }

        if (!candidates.length) {
          return Response.json({ ok: false, error: "Webhook secret not configured" }, { status: 503 });
        }

        // Constant-time compare against every candidate secret
        const enc = new TextEncoder();
        const a = enc.encode(provided);
        const match = candidates.some((c) => {
          const b = enc.encode(c);
          if (a.length !== b.length) return false;
          let diff = 0;
          for (let i = 0; i < a.length; i++) diff |= (a[i] ^ b[i]);
          return diff === 0;
        });
        if (!match) return new Response("Unauthorized", { status: 401 });

        try {
          const { runNotionSync } = await import("@/lib/notion-sync.server");
          const result = await runNotionSync();
          return Response.json(result);
        } catch (e: any) {
          return Response.json({ ok: false, error: e.message }, { status: 500 });
        }
      },
    },
  },
});

