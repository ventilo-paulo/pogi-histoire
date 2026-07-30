import { describe, it, expect } from "vitest";
import { extractToc } from "../src/lib/article-utils";

function bodyHeadings(html: string): string[] {
  return Array.from(html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)).map((m) =>
    m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
  );
}

describe("Normalisation des intertitres", () => {
  it("convertit les titres tout en MAJUSCULES en casse de phrase", () => {
    const { html, toc } = extractToc("<h2>LA GUERRE DE COREE</h2>");
    expect(toc[0].text).toBe("La guerre de coree");
    expect(bodyHeadings(html)).toEqual(["La guerre de coree"]);
  });

  it("laisse intacts les titres déjà correctement formatés", () => {
    const source = "<h2>Le bilan humain</h2><h3>Un tournant</h3>";
    const { html, toc } = extractToc(source);
    expect(toc.map((t) => t.text)).toEqual(["Le bilan humain", "Un tournant"]);
    expect(bodyHeadings(html)).toEqual(["Le bilan humain", "Un tournant"]);
  });

  it("applique exactement la même casse au sommaire et au corps", () => {
    const source = [
      "<h2>INTRODUCTION</h2>",
      "<h3>Les origines</h3>",
      "<h2>UNE GUERRE TOTALE</h2>",
      "<h3>CONSEQUENCES</h3>",
    ].join("");
    const { html, toc } = extractToc(source);
    expect(bodyHeadings(html)).toEqual(toc.map((t) => t.text));
    expect(toc.map((t) => t.text)).toEqual([
      "Introduction",
      "Les origines",
      "Une guerre totale",
      "Consequences",
    ]);
  });

  it("gère les accents, les entités HTML et le balisage interne", () => {
    const { html, toc } = extractToc("<h2>L&#39;ÉTÉ&nbsp;1944 : <b>LA LIBÉRATION</b></h2>");
    expect(toc[0].text).toBe("L'été 1944 : la libération");
    expect(bodyHeadings(html)).toEqual([toc[0].text]);
  });

  it("génère des ancres stables et uniques cohérentes avec le sommaire", () => {
    const { html, toc } = extractToc("<h2>BILAN</h2><h2>Bilan</h2>");
    expect(toc.map((t) => t.id)).toEqual(["bilan", "bilan-2"]);
    for (const item of toc) expect(html).toContain(`id="${item.id}"`);
  });
});
