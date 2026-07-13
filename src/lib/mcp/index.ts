import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listArticles from "./tools/list-articles";
import getArticle from "./tools/get-article";
import listVideos from "./tools/list-videos";
import listCategories from "./tools/list-categories";

// The OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pogi-mcp",
  title: "POGI",
  version: "0.1.0",
  instructions:
    "Read-only access to POGI published content: articles, videos, and categories. Use `list_articles` or `list_videos` to browse, `get_article` to read a full article by slug, and `list_categories` to discover article categories.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listArticles, getArticle, listVideos, listCategories],
});
