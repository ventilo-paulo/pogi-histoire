import { describe, it, expect } from "vitest";
import { buildTrackedUrl, readUtm, shareIntentUrl } from "../src/lib/share";

describe("Liens de partage avec suivi", () => {
  it("ajoute le réseau, le support 'partage', le contenu et son type au lien", () => {
    const url = new URL(buildTrackedUrl("/articles/versailles", "whatsapp", "versailles", "article"));
    expect(url.origin).toBe("https://pogi-histoire.com");
    expect(url.pathname).toBe("/articles/versailles");
    expect(url.searchParams.get("utm_source")).toBe("whatsapp");
    expect(url.searchParams.get("utm_medium")).toBe("partage");
    expect(url.searchParams.get("utm_campaign")).toBe("versailles");
    expect(url.searchParams.get("utm_content")).toBe("article");
  });

  it("le lien copié est identifié comme 'lien_copie'", () => {
    const url = new URL(buildTrackedUrl("/videos/cuba", "lien_copie", "cuba", "video"));
    expect(url.searchParams.get("utm_source")).toBe("lien_copie");
    expect(url.searchParams.get("utm_content")).toBe("video");
  });

  it("le bouton WhatsApp ouvre wa.me avec le lien suivi", () => {
    const tracked = buildTrackedUrl("/articles/a", "whatsapp", "a", "article");
    const href = shareIntentUrl("whatsapp", tracked, "Titre")!;
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("utm_source=whatsapp");
  });

  it("lit les paramètres de suivi à l'arrivée d'un visiteur", () => {
    expect(readUtm("?utm_source=facebook&utm_medium=partage&utm_campaign=cuba&utm_content=video")).toEqual({
      utm_source: "facebook",
      utm_medium: "partage",
      utm_campaign: "cuba",
      utm_content: "video",
    });
    expect(readUtm("?q=napoleon")).toBeNull();
  });
});
