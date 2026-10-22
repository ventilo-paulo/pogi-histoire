import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** What the assistant will take into account (shown to the team before generating). */
export const editorialOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { gatherEditorialContext } = await import("@/lib/editorial-ai.server");
    const ctx = await gatherEditorialContext();
    return {
      articles: ctx.articles.map((a) => ({ title: a.title, category: a.category, views: a.views_90d })),
      videos: ctx.videos.length,
      pageViews: ctx.audience.pageViews,
      siteSearches: ctx.audience.siteSearches.slice(0, 8),
      googleQueries: ctx.google.queries.slice(0, 8).map((q) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks })),
    };
  });

/** Ask the AI for article angles based on topics, articles and audience. */
export const generateAngles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { focus?: string | null } | undefined) => ({
    focus: typeof input?.focus === "string" ? input.focus.trim().slice(0, 500) : "",
  }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { generateArticleAngles } = await import("@/lib/editorial-ai.server");
    return generateArticleAngles({ focus: data.focus, userId: (context as any).userId });
  });
