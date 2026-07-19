import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEMO_TITLES = [
  "Oradour",
  "Projet Manhattan",
  "Hiroshima",
  "Mukden",
  "conquêtes Normandes",
  "Se battre comme au Moyen",
  "T'as la rèf",
  "Kaamelott",
];

function read(p: string) {
  return readFileSync(resolve(process.cwd(), p), "utf8");
}

describe("Aucune carte de démonstration ne subsiste", () => {
  it("/collections ne contient aucun titre de démo", () => {
    const src = read("src/routes/collections.tsx");
    for (const t of DEMO_TITLES) {
      expect(src, `démo "${t}" trouvée dans collections.tsx`).not.toContain(t);
    }
  });

  it("La home (index + carrousel Collections) ne contient aucun titre de démo", () => {
    const src = read("src/routes/index.tsx");
    for (const t of DEMO_TITLES) {
      expect(src, `démo "${t}" trouvée dans index.tsx`).not.toContain(t);
    }
  });
});
