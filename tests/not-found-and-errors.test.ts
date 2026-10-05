/**
 * Régression : pages introuvables et erreurs de chargement (articles / vidéos).
 * 1) Vérifications statiques du code source (toujours exécutées).
 * 2) Vérifications sur le site en marche (BASE_URL, défaut http://localhost:8080),
 *    ignorées automatiquement si le serveur ne répond pas.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const BASE = process.env.BASE_URL ?? "http://localhost:8080";

describe("Code source : 404 et erreurs", () => {
  const catchAll = read("src/routes/$.tsx");
  const notFound = read("src/components/NotFound.tsx");
  const article = read("src/routes/articles.$slug.tsx");
  const video = read("src/routes/videos.$slug.tsx");

  it("la route fourre-tout lève notFound() et est en noindex", () => {
    expect(catchAll).toMatch(/throw notFound\(\)/);
    expect(catchAll).toContain("Page introuvable — POGI Histoire");
    expect(catchAll).toMatch(/name: "robots", content: "noindex"/);
    expect(catchAll).toMatch(/notFoundComponent: NotFound/);
  });

  it("l'écran 404 affiche le bon message", () => {
    expect(notFound).toContain("Page introuvable");
    expect(notFound).toContain("Retour à l'accueil");
  });

  it("article : messages introuvable / erreur + noindex sans données", () => {
    expect(article).toContain("Article introuvable");
    expect(article).toContain("Cet article n'a pas pu être chargé");
    expect(article).toContain("Réessayer");
    expect(article).toMatch(/loaderData \? \[\] : \[\{ name: "robots", content: "noindex" \}\]/);
    expect(article).toMatch(/error instanceof Error \? error\.message/);
  });

  it("vidéo : messages introuvable / erreur + noindex sans données", () => {
    expect(video).toContain("Vidéo introuvable");
    expect(video).toContain("Retour aux vidéos");
    expect(video).toMatch(/loaderData \? \[\] : \[\{ name: "robots", content: "noindex" \}\]/);
    expect(video).toMatch(/error instanceof Error \? error\.message/);
  }, 30000);
});

let online = false;
beforeAll(async () => {
  try {
    const r = await fetch(BASE + "/", { signal: AbortSignal.timeout(30000) });
    online = r.ok;
  } catch (e) {
    console.warn("Serveur injoignable, tests en direct ignorés:", String(e));
    online = false;
  }
}, 40000);

async function get(path: string) {
  const r = await fetch(BASE + path, { signal: AbortSignal.timeout(20000) });
  return { status: r.status, html: await r.text() };
}

describe("Site en marche : 404 et métadonnées SEO", () => {
  it("une adresse inconnue répond 404 avec le bon titre et noindex", async (ctx) => {
    if (!online) return ctx.skip();
    const { status, html } = await get("/page-qui-n-existe-pas-" + Date.now());
    expect(status).toBe(404);
    expect(html).toContain("<title>Page introuvable — POGI Histoire</title>");
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
    expect(html).toContain("Page introuvable");
  });

  it("un article inconnu affiche « Article introuvable » en noindex", async (ctx) => {
    if (!online) return ctx.skip();
    const { html } = await get("/articles/slug-inexistant-" + Date.now());
    expect(html).toContain("Article introuvable");
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
  });

  it("une vidéo inconnue affiche « Vidéo introuvable » en noindex", async (ctx) => {
    if (!online) return ctx.skip();
    const { html } = await get("/videos/slug-inexistant-" + Date.now());
    expect(html).toContain("Vidéo introuvable");
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
  }, 30000);
});
