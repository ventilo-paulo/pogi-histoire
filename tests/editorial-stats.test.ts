import { describe, it, expect } from "vitest";
import { contentSlug, summarizeAudience } from "../src/lib/editorial-stats";

const ev = (event: string, path: string | null, extra: Partial<{ label: string; slug: string; referrer: string }> = {}) => ({
  event,
  path,
  label: extra.label ?? null,
  slug: extra.slug ?? null,
  referrer: extra.referrer ?? null,
});

describe("Statistiques transmises à l'assistant éditorial", () => {
  it("compte les vues par article uniquement à partir des pages vues", () => {
    const s = summarizeAudience([
      ev("page_view", "/articles/versailles"),
      ev("page_view", "/articles/versailles"),
      ev("article_click", "/articles/versailles"),
      ev("page_view", "/articles"),
      ev("page_view", "/videos/cuba"),
    ]);
    expect(s.pageViews).toBe(4);
    expect(s.contentViews).toEqual([
      { key: "article:versailles", count: 2 },
      { key: "video:cuba", count: 1 },
    ]);
  });

  it("regroupe les recherches faites sur le site sans tenir compte des majuscules", () => {
    const s = summarizeAudience([
      ev("search_query", "/", { label: "Napoléon " }),
      ev("search_query", "/", { label: "napoléon" }),
      ev("search_no_results", "/", { label: "Jeanne d'Arc" }),
    ]);
    expect(s.siteSearches).toEqual([{ key: "napoléon", count: 2 }]);
    expect(s.searchesWithoutResult).toEqual([{ key: "jeanne d'arc", count: 1 }]);
  });

  it("la page liste des articles n'est pas un article", () => {
    expect(contentSlug("/articles")).toBeNull();
    expect(contentSlug("/articles/la-guerre-de-coree")).toEqual({ kind: "article", slug: "la-guerre-de-coree" });
  });
});
