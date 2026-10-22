import { describe, it, expect } from "vitest";
import { aggregateByKey, comparePeriods, percentChange, totalsFor } from "../src/lib/search-performance";

describe("Indicateurs Recherche Google", () => {
  it("taux de clic = clics / impressions", () => {
    const t = totalsFor([
      { clicks: 3, impressions: 100, position: 10 },
      { clicks: 1, impressions: 100, position: 20 },
    ]);
    expect(t.clicks).toBe(4);
    expect(t.impressions).toBe(200);
    expect(t.ctr).toBeCloseTo(0.02);
  });

  it("la position moyenne est pondérée par les impressions", () => {
    const t = totalsFor([
      { clicks: 0, impressions: 90, position: 5 },
      { clicks: 0, impressions: 10, position: 50 },
    ]);
    expect(t.position).toBeCloseTo(9.5);
  });

  it("sans impression, pas de position moyenne", () => {
    expect(totalsFor([]).position).toBeNull();
  });

  it("compare les 7 derniers jours aux 7 jours précédents", () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      clicks: i < 7 ? 1 : 2,
      impressions: 10,
      position: 8,
    }));
    const c = comparePeriods(rows, "2026-10-14", 7);
    expect(c.current.clicks).toBe(14);
    expect(c.previous.clicks).toBe(7);
    expect(c.hasPrevious).toBe(true);
    expect(c.range.currentStart).toBe("2026-10-08");
    expect(c.range.previousStart).toBe("2026-10-01");
  });

  it("pas de comparaison quand la période précédente est presque vide", () => {
    const rows = [{ date: "2026-10-14", clicks: 1, impressions: 10, position: 8 }];
    expect(comparePeriods(rows, "2026-10-14", 7).hasPrevious).toBe(false);
    expect(percentChange(5, 0)).toBeNull();
  });

  it("classe les requêtes par clics puis par impressions", () => {
    const list = aggregateByKey([
      { key: "napoléon", clicks: 0, impressions: 50, position: 12 },
      { key: "versailles", clicks: 2, impressions: 10, position: 4 },
      { key: "napoléon", clicks: 0, impressions: 30, position: 12 },
      { key: "corée", clicks: 0, impressions: 90, position: 30 },
    ]);
    expect(list.map((q) => q.key)).toEqual(["versailles", "corée", "napoléon"]);
    expect(list[2].impressions).toBe(80);
  });
});
