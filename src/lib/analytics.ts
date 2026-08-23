import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "page_view"
  | "article_click"
  | "video_click"
  | "collection_click"
  | "search_open"
  | "search_query"
  | "search_result_click"
  | "nav_click"
  | "outbound_click"
  | "share_click";

type Payload = {
  label?: string | null;
  slug?: string | null;
  meta?: Record<string, unknown>;
};

const SESSION_KEY = "pogi_session_id";

function sessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Fire-and-forget event tracking. Never throws, never blocks the UI. */
export function track(event: AnalyticsEvent, payload: Payload = {}) {
  if (typeof window === "undefined") return;
  // Skip the back office — internal traffic shouldn't pollute the stats.
  if (window.location.pathname.startsWith("/admin")) return;

  const row = {
    event,
    path: window.location.pathname,
    label: payload.label ? String(payload.label).slice(0, 256) : null,
    slug: payload.slug ?? null,
    meta: (payload.meta ?? {}) as never,
    session_id: sessionId(),
    referrer: document.referrer ? new URL(document.referrer).hostname : null,
  };

  void supabase
    .from("analytics_events")
    .insert(row)
    .then(undefined, () => {});
}
