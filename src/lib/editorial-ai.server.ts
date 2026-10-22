import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/ai/run-id";
import { summarizeAudience, contentSlug, type AudienceEvent } from "@/lib/editorial-stats";
import { aggregateByKey } from "@/lib/search-performance";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const ANGLE_MODEL = "openai/gpt-6-astra";

const AngleSchema = z.object({
  title: z.string(),
  hook: z.string(),
  angle: z.string(),
  why: z.string(),
  period: z.string(),
  format: z.enum(["article", "video", "article_et_video"]),
  priority: z.enum(["haute", "moyenne", "basse"]),
  keywords: z.array(z.string()),
  relatedArticle: z.string().nullable(),
  category: z.string().nullable(),
});

const ResultSchema = z.object({
  summary: z.string(),
  angles: z.array(AngleSchema),
});

export type ArticleAngle = z.infer<typeof AngleSchema>;

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

async function loadEvents(sinceIso: string): Promise<AudienceEvent[]> {
  const out: AudienceEvent[] = [];
  const page = 1000;
  for (let from = 0; from < 20000; from += page) {
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select("event,path,label,slug,referrer")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as AudienceEvent[]));
    if (!data || data.length < page) break;
  }
  return out;
}

/** Everything the assistant knows about POGI Histoire, gathered server-side. */
export async function gatherEditorialContext() {
  const since28 = isoDaysAgo(32).slice(0, 10);
  const [articlesRes, videosRes, topicsRes, categoriesRes, events, queriesRes, pagesRes] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select("title,slug,category,excerpt,tags,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false }),
    supabaseAdmin
      .from("videos")
      .select("title,slug,category,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false }),
    supabaseAdmin.from("editorial_topics").select("title,notes,status").order("created_at", { ascending: false }),
    supabaseAdmin.from("categories").select("name").order("sort_order"),
    loadEvents(isoDaysAgo(90)),
    supabaseAdmin.from("seo_query_ranks").select("query,clicks,impressions,position").gte("date", since28),
    supabaseAdmin.from("seo_search_pages").select("page,clicks,impressions,position").gte("date", since28),
  ]);

  const audience = summarizeAudience(events);
  const viewsBySlug = new Map(audience.contentViews.map((c) => [c.key, c.count]));

  const articles = (articlesRes.data ?? []).map((a) => ({
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
    tags: a.tags,
    published_at: a.published_at?.slice(0, 10) ?? null,
    views_90d: viewsBySlug.get(`article:${a.slug}`) ?? 0,
  }));
  const videos = (videosRes.data ?? []).map((v) => ({
    title: v.title,
    category: v.category,
    published_at: v.published_at?.slice(0, 10) ?? null,
    views_90d: v.slug ? (viewsBySlug.get(`video:${v.slug}`) ?? 0) : 0,
  }));

  const googleQueries = aggregateByKey(
    ((queriesRes.data ?? []) as Array<{ query: string; clicks: number; impressions: number; position: number }>).map((r) => ({
      key: r.query,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    })),
  )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30)
    .map((q) => ({
      query: q.key,
      clicks: q.clicks,
      impressions: q.impressions,
      position: q.position === null ? null : Math.round(q.position * 10) / 10,
    }));

  const googlePages = aggregateByKey(
    ((pagesRes.data ?? []) as Array<{ page: string; clicks: number; impressions: number; position: number }>).map((r) => ({
      key: r.page,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    })),
  )
    .slice(0, 15)
    .map((p) => {
      let path = p.key;
      try {
        path = new URL(p.key).pathname;
      } catch {
        /* keep raw */
      }
      const c = contentSlug(path);
      return { page: path, kind: c?.kind ?? "page", clicks: p.clicks, impressions: p.impressions };
    });

  return {
    articles,
    videos,
    topics: topicsRes.data ?? [],
    categories: (categoriesRes.data ?? []).map((c) => c.name),
    audience: {
      period: "90 derniers jours",
      pageViews: audience.pageViews,
      topPages: audience.topPages,
      siteSearches: audience.siteSearches,
      searchesWithoutResult: audience.searchesWithoutResult,
      shares: audience.shares,
      referrers: audience.referrers,
    },
    google: { period: "28 derniers jours", queries: googleQueries, pages: googlePages },
  };
}

export type EditorialContext = Awaited<ReturnType<typeof gatherEditorialContext>>;

const INSTRUCTIONS = `Tu es le conseiller éditorial de POGI Histoire, un média indépendant francophone qui publie des récits d'histoire documentés, sourcés et vérifiés, en articles sur pogi-histoire.com et en vidéos sur YouTube (@PogiHistoire).

Ta mission : proposer des angles d'articles historiques qui ont de bonnes chances d'attirer de nouveaux lecteurs et de les faire revenir.

Règles :
- Appuie-toi uniquement sur les données fournies (articles publiés, vidéos, sujets de l'équipe, statistiques du site, requêtes Google). N'invente jamais de chiffre.
- Le site est jeune et les volumes sont faibles : si les statistiques sont trop maigres pour conclure, dis-le franchement dans "why" et appuie-toi plutôt sur la cohérence avec les sujets qui marchent, les recherches faites sur le site et les requêtes Google.
- Ne propose pas un sujet déjà publié ou déjà dans la liste de l'équipe, sauf pour un angle clairement nouveau (suite, autre point de vue) et dis-le.
- Chaque angle doit être historiquement solide : pas de théorie douteuse, pas d'anachronisme. Le ton POGI : récit vivant, accroche forte, rigueur.
- "title" : un titre d'article accrocheur, en français, en minuscules sauf la première lettre et les noms propres (pas de MAJUSCULES).
- "hook" : 1 à 2 phrases d'accroche, comme le début de l'article.
- "angle" : 2 à 3 phrases sur ce que l'article raconte et ce qui le rend différent.
- "why" : 1 à 3 phrases qui expliquent pourquoi cet angle peut attirer des lecteurs de POGI, en citant les données utilisées.
- "period" : l'époque et le lieu (ex. « Japon, 1945 »).
- "keywords" : 2 à 5 recherches Google réalistes en français que des lecteurs pourraient taper.
- "relatedArticle" : le titre exact d'un article publié à relier, sinon null.
- "category" : une catégorie existante du site si elle convient, sinon null.
- "priority" : "haute" pour les angles les plus prometteurs.
- "summary" : 2 à 3 phrases qui résument ce que les données montrent et la stratégie suivie.
Propose exactement 6 angles, variés en époques et en régions.`;

function friendlyError(e: unknown): string {
  if (APICallError.isInstance(e)) {
    const status = e.statusCode ?? 0;
    let detail = "";
    try {
      const body = e.responseBody ? JSON.parse(e.responseBody) : null;
      detail = body?.message ?? body?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    if (status === 402)
      return detail || "Les crédits IA de l'espace de travail sont épuisés. Ajoutez des crédits dans Paramètres → Plans & crédits.";
    if (status === 429) return "Trop de demandes à l'IA en même temps. Réessayez dans une minute.";
    if (status === 403) return detail || "L'accès à l'IA est bloqué pour cet espace de travail.";
    if (status === 401) return "La clé d'accès à l'IA est manquante ou invalide.";
    if (status >= 500) return "Le service d'IA est momentanément indisponible. Réessayez dans quelques minutes.";
    return detail || `L'IA a refusé la demande (erreur ${status}).`;
  }
  if (NoObjectGeneratedError.isInstance(e)) return "La réponse de l'IA était incomplète. Relancez la proposition.";
  if (e instanceof Error && e.name === "AbortError") return "La demande a été interrompue.";
  return e instanceof Error ? e.message : "Erreur inconnue";
}

/** Ask the model for article angles and store the proposal. */
export async function generateArticleAngles(input: { focus: string; userId: string }) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("La clé d'accès à l'IA est manquante.");

  const ctx = await gatherEditorialContext();
  const request = getRequest();
  const runIdFetch = createLovableAiGatewayRunIdFetch(request ? getLovableAiGatewayRunId(request) : undefined);
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const prompt = [
    input.focus
      ? `Piste demandée par l'équipe : ${input.focus}`
      : "Pas de piste imposée : propose les angles les plus prometteurs.",
    "",
    "Données de POGI Histoire :",
    JSON.stringify(ctx, null, 1),
  ].join("\n");

  let output: z.infer<typeof ResultSchema>;
  try {
    const result = streamText({
      model: provider.responses(ANGLE_MODEL),
      instructions: INSTRUCTIONS,
      messages: [{ role: "user", content: prompt }],
      output: Output.object({ schema: ResultSchema }),
      abortSignal: request?.signal,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    output = (await result.output) as z.infer<typeof ResultSchema>;
  } catch (e) {
    console.error("generateArticleAngles failed", e);
    throw new Error(friendlyError(e));
  }

  const angles = (output.angles ?? []).slice(0, 8).map((a) => ({
    ...a,
    keywords: (a.keywords ?? []).slice(0, 5),
  }));
  if (!angles.length) throw new Error("L'IA n'a proposé aucun angle. Relancez la proposition.");

  const stats = {
    summary: output.summary,
    articles: ctx.articles.length,
    videos: ctx.videos.length,
    topics: ctx.topics.length,
    pageViews90d: ctx.audience.pageViews,
    googleQueries: ctx.google.queries.length,
  };

  const { data, error } = await supabaseAdmin
    .from("editorial_angle_runs")
    .insert({
      focus: input.focus || null,
      angles: angles as never,
      context: stats as never,
      model: ANGLE_MODEL,
      created_by: input.userId,
    })
    .select("id,created_at,focus,angles,context")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; created_at: string; focus: string | null; angles: ArticleAngle[]; context: typeof stats };
}
