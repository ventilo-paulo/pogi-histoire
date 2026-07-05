import { defineTool } from "@lovable.dev/mcp-js";
import { getSupabasePublic } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List all POGI article categories with their slugs, ordered by sort order.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = getSupabasePublic();
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,sort_order")
      .order("sort_order", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { categories: data ?? [] },
    };
  },
});
