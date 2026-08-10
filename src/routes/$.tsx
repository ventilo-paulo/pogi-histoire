import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { NotFound } from "@/components/NotFound";

/** Ensures unknown URLs answer with a real HTTP 404 (crawlers, monitoring). */
const flag404 = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseStatus } = await import("@tanstack/react-start/server");
  setResponseStatus(404);
  return null;
});

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
