// Server-only Notion sync engine. Never import this from client-reachable modules at top level.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://connector-gateway.lovable.dev/notion/v1";

type Direction = "notion_to_site" | "site_to_notion" | "run";
type LogRow = { direction: Direction; entity?: string; action?: string; ok?: boolean; message?: string; ref_id?: string; details?: unknown };

async function notion(path: string, init?: RequestInit) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");
  if (!NOTION_API_KEY) throw new Error("Notion is not connected");
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": NOTION_API_KEY,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Notion ${res.status}: ${data.message || text}`);
  return data;
}

// --- Notion property helpers ------------------------------------------------

function rt(text: string) { return [{ type: "text", text: { content: text ?? "" } }]; }

function readText(prop: any): string {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title ?? []).map((r: any) => r.plain_text).join("");
  if (prop.type === "rich_text") return (prop.rich_text ?? []).map((r: any) => r.plain_text).join("");
  if (prop.type === "url") return prop.url ?? "";
  if (prop.type === "email") return prop.email ?? "";
  if (prop.type === "select") return prop.select?.name ?? "";
  if (prop.type === "status") return prop.status?.name ?? "";
  if (prop.type === "date") return prop.date?.start ?? "";
  if (prop.type === "checkbox") return prop.checkbox ? "true" : "";
  if (prop.type === "files") {
    const f = (prop.files ?? [])[0];
    if (!f) return "";
    return f.external?.url ?? f.file?.url ?? "";
  }
  return "";
}

function propsFor(item: Record<string, any>, mapping: Record<string, string>, schema: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [key, notionName] of Object.entries(mapping)) {
    if (!notionName || !schema[notionName]) continue;
    const type = schema[notionName].type;
    const val = item[key];
    if (val == null || val === "") continue;
    switch (type) {
      case "title": out[notionName] = { title: rt(String(val)) }; break;
      case "rich_text": out[notionName] = { rich_text: rt(String(val)) }; break;
      case "url": out[notionName] = { url: String(val) }; break;
      case "select": out[notionName] = { select: { name: String(val) } }; break;
      case "status": out[notionName] = { status: { name: String(val) } }; break;
      case "date": out[notionName] = { date: { start: new Date(val).toISOString() } }; break;
      case "checkbox": out[notionName] = { checkbox: Boolean(val) }; break;
      case "files": out[notionName] = { files: [{ name: "image", external: { url: String(val) } }] }; break;
    }
  }
  return out;
}

// --- Default mappings -------------------------------------------------------

export const DEFAULT_ARTICLE_MAPPING = {
  title: "Titre", slug: "Slug", status: "Statut", category: "Catégorie",
  author: "Auteur", excerpt: "Extrait", image: "Image", published_at: "Date",
};
export const DEFAULT_VIDEO_MAPPING = {
  title: "Titre", subtitle: "Sous-titre", video_url: "URL", thumbnail: "Miniature",
  format: "Format", category: "Catégorie", status: "Statut", published_at: "Date",
};

// --- Sync one entity --------------------------------------------------------

async function fetchDbSchema(dbId: string): Promise<Record<string, any>> {
  const db = await notion(`/databases/${dbId}`);
  return db.properties ?? {};
}

async function syncEntity(
  entity: "article" | "video",
  dbId: string,
  mapping: Record<string, string>,
  lastSyncIso: string | null,
  log: LogRow[],
) {
  const table = entity === "article" ? "articles" : "videos";
  const schema = await fetchDbSchema(dbId);

  // --- Pull: Notion -> Site
  let cursor: string | undefined;
  do {
    const body: any = { page_size: 50 };
    if (lastSyncIso) body.filter = { timestamp: "last_edited_time", last_edited_time: { on_or_after: lastSyncIso } };
    if (cursor) body.start_cursor = cursor;
    const res = await notion(`/databases/${dbId}/query`, { method: "POST", body: JSON.stringify(body) });
    for (const page of res.results ?? []) {
      try {
        const p = page.properties ?? {};
        const item: any = {};
        for (const [k, notionName] of Object.entries(mapping)) {
          if (!notionName || !p[notionName]) continue;
          item[k] = readText(p[notionName]);
        }
        item.notion_page_id = page.id;
        item.notion_last_edited_at = page.last_edited_time;
        // Normalize
        if ("status" in item) { item.published = /publi/i.test(item.status); delete item.status; }
        if (entity === "article" && !item.slug && item.title) {
          item.slug = String(item.title).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
        if (item.image) { item.image_url = item.image; delete item.image; }
        if (item.thumbnail) { item.thumbnail_url = item.thumbnail; delete item.thumbnail; }
        if (item.published_at) { try { item.published_at = new Date(item.published_at).toISOString(); } catch { delete item.published_at; } }

        // Upsert by notion_page_id
        const { data: existing } = await supabaseAdmin.from(table).select("id, updated_at").eq("notion_page_id", page.id).maybeSingle();
        if (existing) {
          // Conflict: last-write-wins by comparing timestamps
          const siteTs = new Date((existing as any).updated_at).getTime();
          const notionTs = new Date(page.last_edited_time).getTime();
          if (siteTs > notionTs) { log.push({ direction: "notion_to_site", entity, action: "skip", ref_id: page.id, message: "site newer" }); continue; }
          const { error } = await supabaseAdmin.from(table).update(item).eq("id", (existing as any).id);
          if (error) throw error;
          log.push({ direction: "notion_to_site", entity, action: "update", ref_id: page.id });
        } else {
          if (entity === "article" && !item.title) { log.push({ direction: "notion_to_site", entity, action: "skip", ref_id: page.id, message: "no title" }); continue; }
          if (entity === "video" && !item.video_url) { log.push({ direction: "notion_to_site", entity, action: "skip", ref_id: page.id, message: "no video_url" }); continue; }
          const { error } = await supabaseAdmin.from(table).insert(item);
          if (error) throw error;
          log.push({ direction: "notion_to_site", entity, action: "create", ref_id: page.id });
        }
      } catch (e: any) {
        log.push({ direction: "notion_to_site", entity, action: "error", ok: false, ref_id: page.id, message: e.message });
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // --- Push: Site -> Notion (rows updated since last sync)
  const sinceIso = lastSyncIso ?? new Date(0).toISOString();
  const { data: rows } = await supabaseAdmin.from(table).select("*").gt("updated_at", sinceIso);
  for (const row of rows ?? []) {
    try {
      // Skip rows that Notion just pushed to us (their update timestamps will match)
      if ((row as any).notion_last_edited_at && new Date((row as any).notion_last_edited_at).getTime() >= new Date((row as any).updated_at).getTime() - 2000) {
        continue;
      }
      const src: any = { ...row };
      src.status = src.published ? "Publié" : "Brouillon";
      if (entity === "article") src.image = src.image_url;
      if (entity === "video") src.thumbnail = src.thumbnail_url;
      const properties = propsFor(src, mapping, schema);
      if ((row as any).notion_page_id) {
        await notion(`/pages/${(row as any).notion_page_id}`, { method: "PATCH", body: JSON.stringify({ properties }) });
        log.push({ direction: "site_to_notion", entity, action: "update", ref_id: (row as any).id });
      } else {
        const created = await notion(`/pages`, {
          method: "POST",
          body: JSON.stringify({ parent: { database_id: dbId }, properties }),
        });
        await supabaseAdmin.from(table).update({ notion_page_id: created.id, notion_last_edited_at: created.last_edited_time }).eq("id", (row as any).id);
        log.push({ direction: "site_to_notion", entity, action: "create", ref_id: (row as any).id });
      }
    } catch (e: any) {
      log.push({ direction: "site_to_notion", entity, action: "error", ok: false, ref_id: (row as any).id, message: e.message });
    }
  }
}

export async function runNotionSync(): Promise<{ ok: boolean; counts: Record<string, number>; error?: string }> {
  const started = new Date().toISOString();
  const { data: settings, error: sErr } = await supabaseAdmin.from("notion_settings").select("*").eq("id", true).maybeSingle();
  if (sErr) throw sErr;
  if (!settings) throw new Error("Notion settings introuvables");
  if (!(settings as any).enabled) return { ok: true, counts: { skipped: 1 } };
  const log: LogRow[] = [];
  const last = (settings as any).last_sync_at as string | null;

  try {
    if ((settings as any).articles_db_id) {
      const m = { ...DEFAULT_ARTICLE_MAPPING, ...((settings as any).articles_mapping ?? {}) };
      await syncEntity("article", (settings as any).articles_db_id, m, last, log);
    }
    if ((settings as any).videos_db_id) {
      const m = { ...DEFAULT_VIDEO_MAPPING, ...((settings as any).videos_mapping ?? {}) };
      await syncEntity("video", (settings as any).videos_db_id, m, last, log);
    }
  } catch (e: any) {
    log.push({ direction: "run", action: "error", ok: false, message: e.message });
  }

  const counts = log.reduce((acc, l) => { const k = `${l.direction}:${l.action}`; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  if (log.length) await supabaseAdmin.from("notion_sync_log").insert(log.map(l => ({ ...l, ok: l.ok ?? true })) as any);
  await supabaseAdmin.from("notion_sync_log").insert({ direction: "run", action: "summary", ok: !log.some(l => l.action === "error"), details: counts, message: `run finished (${log.length} events)` } as any);
  await supabaseAdmin.from("notion_settings").update({ last_sync_at: started }).eq("id", true);

  return { ok: true, counts };
}
