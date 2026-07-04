import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/notion-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.NOTION_WEBHOOK_SECRET;
        if (!expected) {
          return Response.json({ ok: false, error: "Webhook secret not configured" }, { status: 503 });
        }
        const provided =
          request.headers.get("x-webhook-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        // Constant-time compare
        const a = new TextEncoder().encode(provided);
        const b = new TextEncoder().encode(expected);
        let ok = a.length === b.length;
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          if ((a[i] ?? 0) !== (b[i] ?? 0)) ok = false;
        }
        if (!ok) {
          return new Response("Unauthorized", { status: 401 });
        }
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
