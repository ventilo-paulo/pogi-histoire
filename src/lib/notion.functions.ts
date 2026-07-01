import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: any) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

export const getNotionSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase.from("notion_settings").select("*").eq("id", true).maybeSingle();
    if (error) throw error;
    const hasKey = !!process.env.NOTION_API_KEY;
    return { settings: data, hasNotionKey: hasKey };
  });

export const saveNotionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articles_db_id?: string | null; videos_db_id?: string | null; enabled?: boolean; articles_mapping?: any; videos_mapping?: any }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = { id: true };
    if ("articles_db_id" in data) patch.articles_db_id = data.articles_db_id || null;
    if ("videos_db_id" in data) patch.videos_db_id = data.videos_db_id || null;
    if ("enabled" in data) patch.enabled = !!data.enabled;
    if ("articles_mapping" in data) patch.articles_mapping = data.articles_mapping ?? {};
    if ("videos_mapping" in data) patch.videos_mapping = data.videos_mapping ?? {};
    const { error } = await context.supabase.from("notion_settings").upsert(patch);
    if (error) throw error;
    return { ok: true };
  });

export const listSyncLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("notion_sync_log").select("*").order("run_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const runSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { runNotionSync } = await import("@/lib/notion-sync.server");
    return await runNotionSync();
  });

export const testNotionConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { articles_db_id?: string | null; videos_db_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const NOTION_API_KEY = process.env.NOTION_API_KEY;
    if (!LOVABLE_API_KEY || !NOTION_API_KEY) throw new Error("Notion n'est pas connecté");
    const results: any = {};
    for (const [key, id] of Object.entries({ articles: data.articles_db_id, videos: data.videos_db_id })) {
      if (!id) { results[key] = { ok: false, message: "ID manquant" }; continue; }
      try {
        const res = await fetch(`https://connector-gateway.lovable.dev/notion/v1/databases/${id}`, {
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": NOTION_API_KEY },
        });
        const json = await res.json();
        if (!res.ok) { results[key] = { ok: false, message: json.message ?? `HTTP ${res.status}` }; continue; }
        results[key] = { ok: true, title: (json.title ?? []).map((t: any) => t.plain_text).join(""), properties: Object.entries(json.properties ?? {}).map(([n, p]: any) => ({ name: n, type: p.type })) };
      } catch (e: any) {
        results[key] = { ok: false, message: e.message };
      }
    }
    return results;
  });
