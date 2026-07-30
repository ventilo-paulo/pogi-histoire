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
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function extractToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const patched = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_m, lvl, attrs, inner) => {
    const level = Number(lvl) as 2 | 3;
    const rawText = String(inner).replace(/<[^>]+>/g, "");
    const text = decodeEntities(rawText).replace(/\s+/g, " ").trim();
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

/**
 * Remove every font-related formatting coming from the WYSIWYG or from pasted
 * content so that only the editorial charter (.article-prose) applies.
 * - unwraps <font> / <span> wrappers
 * - drops style / face / size / color / align / class attributes
 * - converts layout <div> into semantic <p>
 */
export function stripInlineTypography(html: string): string {
  if (!html) return "";
  let out = html;
  // Unwrap <font> and plain <span> wrappers (keep their content)
  out = out.replace(/<\/?font[^>]*>/gi, "");
  out = out.replace(/<span[^>]*>/gi, "").replace(/<\/span>/gi, "");
  // Drop formatting attributes on every remaining tag
  out = out.replace(/<([a-z][a-z0-9]*)((?:\s+[^>]*)?)>/gi, (_m, tag, attrs) => {
    const cleaned = String(attrs).replace(
      /\s+(style|face|size|color|bgcolor|align|width|height|class)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
      "",
    );
    return `<${tag}${cleaned}>`;
  });
  // Layout divs -> paragraphs
  out = out.replace(/<div(\s[^>]*)?>/gi, "<p>").replace(/<\/div>/gi, "</p>");
  return out;
}
