import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabasePublic } from "../supabase";

export default defineTool({
  name: "get_article",
  title: "Get article",
  description: "Fetch a full published POGI article by its slug, including HTML content.",
  inputSchema: {
    slug: z.string().min(1).describe("The article slug, e.g. 'le-roi-et-le-genie'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = getSupabasePublic();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No published article with slug '${slug}'.` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { article: data },
    };
  },
});
