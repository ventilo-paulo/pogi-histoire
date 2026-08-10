import { createFileRoute } from "@tanstack/react-router";
import { NotFound } from "@/components/NotFound";

/** Ensures unknown URLs answer with a real HTTP 404 (crawlers, monitoring). */
async function flag404() {
  if (!import.meta.env.SSR) return null;
  try {
    const { setResponseStatus } = await import("@tanstack/react-start/server");
    setResponseStatus(404);
  } catch {
    /* status best-effort: the branded 404 page still renders */
  }
  return null;
}

export const Route = createFileRoute("/$")({
  loader: () => flag404(),
  head: () => ({
    meta: [
      { title: "Page introuvable — POGI Histoire" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "La page que vous cherchez n'existe pas ou a été déplacée." },
    ],
  }),
  component: NotFound,
});
