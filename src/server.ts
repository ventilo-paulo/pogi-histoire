import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Long-lived caching for immutable static assets (fonts, images, hashed build output).
const IMMUTABLE_ASSET = /\.(woff2?|ttf|otf|webp|avif|png|jpe?g|gif|svg|ico|mp4|webm)$/i;
const HASHED_BUILD = /^\/(_build|assets|_server)\//;

function withCacheHeaders(request: Request, response: Response): Response {
  if (request.method !== "GET" || !response.ok) return response;
  if (response.headers.has("cache-control")) return response;

  const { pathname } = new URL(request.url);
  const isBuildAsset = HASHED_BUILD.test(pathname);
  const isStatic = IMMUTABLE_ASSET.test(pathname) || pathname.startsWith("/fonts/");
  if (!isBuildAsset && !isStatic) return response;

  const headers = new Headers(response.headers);
  headers.set(
    "cache-control",
    isBuildAsset
      ? "public, max-age=31536000, immutable"
      : "public, max-age=604800, stale-while-revalidate=86400",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withCacheHeaders(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

