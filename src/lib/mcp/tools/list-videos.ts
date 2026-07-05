import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabasePublic } from "../supabase";

export default defineTool({
  name: "list_videos",
  title: "List videos",
  description: "List published POGI videos, most recently published first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
    format: z.enum(["court", "long"]).optional().describe("Filter by video format."),
    category: z.string().optional().describe("Filter by category."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, format, category }) => {
    const supabase = getSupabasePublic();
    let q = supabase
      .from("videos")
      .select("id,title,subtitle,video_url,thumbnail_url,format,category,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(limit ?? 20);
    if (format) q = q.eq("format", format);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { videos: data ?? [] },
    };
  },
});
