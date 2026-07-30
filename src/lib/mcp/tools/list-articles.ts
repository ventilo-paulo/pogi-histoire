import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabasePublic } from "../supabase";

export default defineTool({
  name: "list_articles",
  title: "List articles",
  description:
    "List published POGI articles, most recently published first. Optionally filter by category slug or search query.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
    category: z.string().optional().describe("Filter by category slug or name."),
    query: z.string().optional().describe("Search in title and excerpt."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, category, query }) => {
    const supabase = getSupabasePublic();
    let q = supabase
      .from("articles")
      .select("id,slug,title,excerpt,category,author,image_url,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(limit ?? 20);
    if (category) q = q.eq("category", category);
    if (query) {
      // Treat the search text as plain data: strip PostgREST filter metacharacters
      // (comma, parentheses, quotes, backslash, wildcards) so it cannot inject clauses.
      const safe = query.replace(/[,()"'\\%*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
      if (safe) q = q.or(`title.ilike."%${safe}%",excerpt.ilike."%${safe}%"`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { articles: data ?? [] },
    };
  },
});
