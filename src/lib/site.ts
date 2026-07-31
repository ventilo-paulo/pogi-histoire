export const SITE_URL = "https://pogi-histoire.lovable.app";

/** Build an absolute URL for og:image / twitter:image from a Vite asset path or relative URL. */
export function absUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
