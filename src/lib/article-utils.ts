/** Compute reading time in minutes from HTML content (fr, ~220 wpm). */
export function readingTimeMin(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 220));
}

/** Slugify for anchor ids. */
export function slugifyAnchor(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/**
 * Parse HTML string, assign stable ids to h2/h3, and return a TOC + patched HTML.
 * DOM parsing is done via a lightweight regex since we run isomorphically.
 */
export function extractToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const patched = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_m, lvl, attrs, inner) => {
    const level = Number(lvl) as 2 | 3;
    const text = String(inner).replace(/<[^>]+>/g, "").trim();
    if (!text) return _m;
    let id = slugifyAnchor(text);
    if (!id) return _m;
    let n = 1;
    let candidate = id;
    while (used.has(candidate)) candidate = `${id}-${++n}`;
    id = candidate;
    used.add(id);
    toc.push({ id, text, level });
    const hasId = /\sid=/.test(attrs);
    const newAttrs = hasId ? attrs : `${attrs} id="${id}"`;
    return `<h${lvl}${newAttrs}>${inner}</h${lvl}>`;
  });
  return { html: patched, toc };
}
