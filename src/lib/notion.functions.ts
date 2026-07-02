import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/notion/v1";

async function ensureAdmin(ctx: any) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

function notionHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  if (!LOVABLE_API_KEY || !NOTION_API_KEY) throw new Error("Notion n'est pas connecté");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": NOTION_API_KEY,
    "Content-Type": "application/json",
  };
}

function extractId(input: string): string {
  const s = (input || "").trim();
  const m = s.match(/([0-9a-fA-F]{32})|([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
  if (!m) throw new Error("ID / URL Notion invalide");
  return m[0].replace(/-/g, "");
}

export const getNotionSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase.from("notion_settings").select("*").eq("id", true).maybeSingle();
    if (error) throw error;
    return { settings: data, hasNotionKey: !!process.env.NOTION_API_KEY };
  });

export const saveNotionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { content_db_id?: string | null; enabled?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = { id: true };
    if ("content_db_id" in data) {
      const v = data.content_db_id ? extractId(data.content_db_id) : null;
      patch.articles_db_id = v;
      patch.videos_db_id = v; // uniformisé sur la même base
    }
    if ("enabled" in data) patch.enabled = !!data.enabled;
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
  .inputValidator((d: { content_db_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const headers = notionHeaders();

    // Étape 1 : ping Notion (users/me) pour valider le token
    const meRes = await fetch(`${GATEWAY}/users/me`, { headers });
    const me = await meRes.json();
    if (!meRes.ok) return { ok: false, step: "auth", message: me.message ?? `HTTP ${meRes.status}` };

    // Étape 2 : base configurée
    if (!data.content_db_id) {
      return { ok: true, step: "auth-only", bot: me.name ?? "Notion", message: "Connecté à Notion. Renseigne l'ID de la base pour finir." };
    }
    const id = extractId(data.content_db_id);
    const dbRes = await fetch(`${GATEWAY}/databases/${id}`, { headers });
    const db = await dbRes.json();
    if (!dbRes.ok) return { ok: false, step: "database", message: db.message ?? `HTTP ${dbRes.status}` };
    return {
      ok: true,
      step: "database",
      bot: me.name ?? "Notion",
      title: (db.title ?? []).map((t: any) => t.plain_text).join(""),
      url: db.url,
      properties: Object.entries(db.properties ?? {}).map(([n, p]: any) => ({ name: n, type: p.type })),
    };
  });

export const createPogiNotionDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { parent_page: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const headers = notionHeaders();
    const parentId = extractId(data.parent_page);

    const body = {
      parent: { type: "page_id", page_id: parentId },
      icon: { type: "emoji", emoji: "🎬" },
      title: [{ type: "text", text: { content: "Chaîne POGI" } }],
      properties: {
        Titre: { title: {} },
        Type: {
          select: {
            options: [
              { name: "Article", color: "blue" },
              { name: "Vidéo", color: "red" },
            ],
          },
        },
        Statut: {
          select: {
            options: [
              { name: "Idée", color: "default" },
              { name: "En cours", color: "orange" },
              { name: "Brouillon", color: "gray" },
              { name: "À relire", color: "yellow" },
              { name: "Publié", color: "green" },
            ],
          },
        },
        Catégorie: {
          select: {
            options: [
              { name: "Antiquité", color: "orange" },
              { name: "Moyen Âge", color: "yellow" },
              { name: "Renaissance", color: "purple" },
              { name: "XIXe siècle", color: "blue" },
              { name: "XXe siècle", color: "red" },
              { name: "Autre", color: "default" },
            ],
          },
        },
        Slug: { rich_text: {} },
        Auteur: { rich_text: {} },
        Extrait: { rich_text: {} },
        Image: { url: {} },
        "URL vidéo": { url: {} },
        "Date publication": { date: {} },
        lovable_id: { rich_text: {} },
      },
    };

    const res = await fetch(`${GATEWAY}/databases`, { method: "POST", headers, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);

    const dbId: string = json.id;
    await context.supabase.from("notion_settings").upsert({ id: true, articles_db_id: dbId, videos_db_id: dbId });
    return { ok: true, database_id: dbId, url: json.url };
  });
