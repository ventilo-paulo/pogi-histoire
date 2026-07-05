import { defineMcp } from "@lovable.dev/mcp-js";
import listArticles from "./tools/list-articles";
import getArticle from "./tools/get-article";
import listVideos from "./tools/list-videos";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "pogi-mcp",
  title: "POGI",
  version: "0.1.0",
  instructions:
    "Read-only access to POGI published content: articles, videos, and categories. Use `list_articles` or `list_videos` to browse, `get_article` to read a full article by slug, and `list_categories` to discover article categories.",
  tools: [listArticles, getArticle, listVideos, listCategories],
});
