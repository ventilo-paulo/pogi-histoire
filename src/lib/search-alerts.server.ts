/** Surveillance des recherches : alerte quand trop de recherches sans résultat ou vides. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL } from "@/lib/site";

export type SearchAlertSettings = {
  enabled: boolean;
  window_days: number;
  min_searches: number;
  no_results_threshold_pct: number;
  empty_threshold_pct: number;
  email_enabled: boolean;
  notify_email: string | null;
  last_alert_at: string | null;
};

const DEFAULTS: SearchAlertSettings = {
  enabled: true,
  window_days: 7,
  min_searches: 20,
  no_results_threshold_pct: 25,
  empty_threshold_pct: 50,
  email_enabled: true,
  notify_email: null,
  last_alert_at: null,
};

export async function loadSearchAlertSettings(): Promise<SearchAlertSettings> {
  const { data } = await supabaseAdmin
    .from("search_alert_settings" as any)
    .select("*")
    .maybeSingle();
  return { ...DEFAULTS, ...((data as any) ?? {}) };
}

function topTerms(rows: { label: string | null }[], limit = 10) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = (r.label ?? "").trim();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function notifyByEmail(subject: string, html: string, text: string, to: string) {
  try {
    await supabaseAdmin.rpc("enqueue_email" as any, {
      queue_name: "transactional_emails",
      payload: {
        to,
        from: "Alertes POGI <alertes@notify.pogi-histoire.com>",
        sender_domain: "notify.pogi-histoire.com",
        subject,
        html,
        text,
        purpose: "transactional",
        label: "search-alert",
        message_id: crypto.randomUUID(),
        queued_at: new Date().toISOString(),
      },
    } as any);
  } catch (e) {
    console.error("Search alert email could not be queued", e);
  }
}

/** Calcule les taux sur la fenêtre et lève une alerte si un seuil est franchi. */
export async function runSearchAlertCheck(trigger: "cron" | "manual" = "cron") {
  const s = await loadSearchAlertSettings();
  const since = new Date(Date.now() - Math.max(1, s.window_days) * 86400000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("event,label,created_at")
    .in("event", ["search_query", "search_no_results", "search_empty"])
    .gte("created_at", since)
    .limit(50000);

  if (error) return { ok: false, error: error.message, trigger };

  const rows = (data as any[]) ?? [];
  const queries = rows.filter((r) => r.event === "search_query");
  const noResults = rows.filter((r) => r.event === "search_no_results");
  const empties = rows.filter((r) => r.event === "search_empty");

  const total = queries.length;
  const noResultsPct = total ? Math.round((noResults.length / total) * 100) : 0;
  const emptyPct = total + empties.length ? Math.round((empties.length / (total + empties.length)) * 100) : 0;

  const topNoResults = topTerms(noResults);
  const topEmpty = topTerms(empties);

  const summary = {
    ok: true,
    trigger,
    enabled: s.enabled,
    window_days: s.window_days,
    searches: total,
    no_results: noResults.length,
    no_results_pct: noResultsPct,
    empty: empties.length,
    empty_pct: emptyPct,
    top_no_results: topNoResults,
    top_empty: topEmpty,
    alerts: [] as string[],
  };

  if (!s.enabled || total < s.min_searches) return summary;

  const breaches: { kind: string; title: string; detail: string }[] = [];
  if (noResultsPct >= s.no_results_threshold_pct) {
    breaches.push({
      kind: "search_no_results",
      title: `Recherches sans résultat : ${noResultsPct}% (seuil ${s.no_results_threshold_pct}%)`,
      detail:
        `${noResults.length} recherche(s) sans résultat sur ${total} sur ${s.window_days} jours. ` +
        (topNoResults.length ? `Requêtes : ${topNoResults.map(([t, n]) => `${t} (${n})`).join(", ")}` : ""),
    });
  }
  if (emptyPct >= s.empty_threshold_pct) {
    breaches.push({
      kind: "search_empty",
      title: `Recherches vides / abandonnées : ${emptyPct}% (seuil ${s.empty_threshold_pct}%)`,
      detail:
        `${empties.length} session(s) de recherche sans requête ou sans clic sur ${s.window_days} jours. ` +
        (topEmpty.length ? `Requêtes abandonnées : ${topEmpty.map(([t, n]) => `${t} (${n})`).join(", ")}` : ""),
    });
  }

  if (!breaches.length) return summary;

  summary.alerts = breaches.map((b) => b.title);

  await supabaseAdmin.from("seo_alerts" as any).insert(
    breaches.map((b) => ({
      level: "warning",
      kind: b.kind,
      target: "/articles",
      title: b.title,
      detail: b.detail,
    })),
  );

  if (s.email_enabled && s.notify_email) {
    const esc = (v: unknown) =>
      String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const list = (t: [string, number][]) =>
      t.length
        ? `<ul>${t.map(([k, n]) => `<li>${esc(k)} — ${esc(n)}</li>`).join("")}</ul>`
        : "<p>Aucune requête enregistrée.</p>";
    const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6">
      <h2>Alerte recherche — POGI</h2>
      <p>Sur les ${esc(s.window_days)} derniers jours : ${esc(total)} recherche(s), ${esc(noResults.length)} sans résultat (${esc(noResultsPct)}%), ${esc(empties.length)} vide(s)/abandon(s) (${esc(emptyPct)}%).</p>
      <ul>${breaches.map((b) => `<li><strong>${esc(b.title)}</strong><br/>${esc(b.detail)}</li>`).join("")}</ul>
      <h3>Requêtes sans résultat</h3>${list(topNoResults)}
      <h3>Requêtes abandonnées</h3>${list(topEmpty)}
      <p><a href="${esc(SITE_URL)}">${esc(SITE_URL)}</a> — détail dans Admin &gt; Audience.</p>
    </div>`;

    await notifyByEmail(
      `Alerte recherche POGI — ${breaches.length} seuil(s) dépassé(s)`,
      html,
      breaches.map((b) => `${b.title}\n${b.detail}`).join("\n\n"),
      s.notify_email,
    );
  }

  await supabaseAdmin
    .from("search_alert_settings" as any)
    .update({ last_alert_at: new Date().toISOString() })
    .eq("id", true);

  return summary;
}
