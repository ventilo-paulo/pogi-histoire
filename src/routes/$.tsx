import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/NotFound";

/** Unknown URLs throw notFound() so SSR answers with a real HTTP 404. */
export const Route = createFileRoute("/$")({
  loader: () => {
    throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Page introuvable — POGI Histoire" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "La page que vous cherchez n'existe pas ou a été déplacée." },
    ],
  }),
  component: NotFound,
  notFoundComponent: NotFound,
});
