import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/notion-sync")({
  server: {
    handlers: {
      POST: async () => {
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
