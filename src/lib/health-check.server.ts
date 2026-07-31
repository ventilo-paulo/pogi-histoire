import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { listSiteUrls, SITE_URL } from "@/lib/seo-check.server";

type CheckKind = "page" | "asset" | "image" | "database";

export type HealthCheck = {
  target: string;
  kind: CheckKind;
  label: string;
  status: "ok" | "fail";
  http_status: number | null;
  response_ms: number | null;
  detail: string | null;
};

const TIMEOUT_MS = 15000;

async function timedFetch(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "POGI-HealthBot/1.0", ...(init?.headers ?? {}) },
    });
    return { res, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/** Signs that a page rendered an error / empty shell instead of real content. */
function inspectHtml(html: string) {
  const problems: string[] = [];
  const lower = html.toLowerCase();
  if (!/<title[^>]*>[^<]{3,}<\/title>/i.test(html)) problems.push("titre de page manquant");
  // Pages are hydrated client-side, so only flag a truly empty document
  // (no app shell script/root at all) rather than missing content tags.
  if (!/<script|id=["']root["']/i.test(html)) problems.push("page vide (application non chargée)");
  if (html.length < 1500) problems.push("page quasiment vide");

  if (lower.includes("article introuvable") || lower.includes("page introuvable"))
    problems.push("page d'erreur 404 affichée");
  if (lower.includes("application error") || lower.includes("internal server error"))
    problems.push("erreur serveur affichée");
  if (lower.includes("hydration failed")) problems.push("erreur de rendu (hydratation)");
  return problems;
}

function extractImages(html: string, max = 8) {
  const urls = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.size < max) {
    const raw = m[1];
    if (raw.startsWith("data:")) continue;
    try {
      urls.add(new URL(raw, SITE_URL).href);
    } catch {
      /* ignore malformed src */
    }
  }
  const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (og) {
    try {
      urls.add(new URL(og[1], SITE_URL).href);
    } catch {
      /* ignore */
    }
  }
  return [...urls];
}

async function checkPage(url: string, label: string): Promise<{ check: HealthCheck; html?: string }> {
  try {
    const { res, ms } = await timedFetch(url);
    if (res.status >= 300 && res.status < 400) {
      return {
        check: {
          target: url,
          kind: "page",
          label,
          status: "fail",
          http_status: res.status,
          response_ms: ms,
          detail: `Redirection inattendue vers ${res.headers.get("location") ?? "?"}`,
        },
      };
    }
    if (!res.ok) {
      return {
        check: {
          target: url,
          kind: "page",
          label,
          status: "fail",
          http_status: res.status,
          response_ms: ms,
          detail: `Le serveur répond ${res.status}`,
        },
      };
    }
    const html = await res.text();
    const problems = inspectHtml(html);
    return {
      check: {
        target: url,
        kind: "page",
        label,
        status: problems.length ? "fail" : "ok",
        http_status: res.status,
        response_ms: ms,
        detail: problems.length ? problems.join(", ") : null,
      },
      html,
    };
  } catch (e) {
    return {
      check: {
        target: url,
        kind: "page",
        label,
        status: "fail",
        http_status: null,
        response_ms: null,
        detail: e instanceof Error ? `Page injoignable : ${e.message}` : "Page injoignable",
      },
    };
  }
}

async function checkAsset(
  url: string,
  label: string,
  validate?: (body: string) => string | null,
): Promise<HealthCheck> {
  try {
    const { res, ms } = await timedFetch(url);
    if (!res.ok) {
      return {
        target: url,
        kind: "asset",
        label,
        status: "fail",
        http_status: res.status,
        response_ms: ms,
        detail: `Le serveur répond ${res.status}`,
      };
    }
    const body = await res.text();
    const problem = validate?.(body) ?? null;
    return {
      target: url,
      kind: "asset",
      label,
      status: problem ? "fail" : "ok",
      http_status: res.status,
      response_ms: ms,
      detail: problem,
    };
  } catch (e) {
    return {
      target: url,
      kind: "asset",
      label,
      status: "fail",
      http_status: null,
      response_ms: null,
      detail: e instanceof Error ? `Ressource injoignable : ${e.message}` : "Ressource injoignable",
    };
  }
}

async function checkImage(url: string): Promise<HealthCheck> {
  try {
    const { res, ms } = await timedFetch(url, { method: "GET", headers: { Range: "bytes=0-1024" } });
    const ok = res.status >= 200 && res.status < 400;
    return {
      target: url,
      kind: "image",
      label: url.split("/").pop() ?? url,
      status: ok ? "ok" : "fail",
      http_status: res.status,
      response_ms: ms,
      detail: ok ? null : `Image cassée (${res.status})`,
    };
  } catch (e) {
    return {
      target: url,
      kind: "image",
      label: url.split("/").pop() ?? url,
      status: "fail",
      http_status: null,
      response_ms: null,
      detail: e instanceof Error ? `Image injoignable : ${e.message}` : "Image injoignable",
    };
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const started = Date.now();
  try {
    const { error, count } = await supabaseAdmin
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("published", true);
    if (error) throw new Error(error.message);
    return {
      target: "database:articles",
      kind: "database",
      label: "Base de données (articles publiés)",
      status: (count ?? 0) > 0 ? "ok" : "fail",
      http_status: null,
      response_ms: Date.now() - started,
      detail: (count ?? 0) > 0 ? null : "Aucun article publié n'est visible en base",
    };
  } catch (e) {
    return {
      target: "database:articles",
      kind: "database",
      label: "Base de données (articles publiés)",
      status: "fail",
      http_status: null,
      response_ms: Date.now() - started,
      detail: e instanceof Error ? e.message : "Erreur base de données",
    };
  }
}

async function notifyByEmail(subject: string, lines: string[]) {
  const { data: settings } = await supabaseAdmin
    .from("site_health_settings" as any)
    .select("email_enabled,notify_email")
    .maybeSingle();
  const s = settings as any;
  if (!s?.email_enabled || !s?.notify_email) return;

  const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6">
    <h2 style="margin:0 0 12px">Alerte site POGI Histoire</h2>
    <ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>
    <p style="margin-top:16px"><a href="${SITE_URL}">${SITE_URL}</a> — détail dans Admin &gt; Santé du site.</p>
  </div>`;

  try {
    await supabaseAdmin.rpc("enqueue_email" as any, {
      queue_name: "transactional_emails",
      payload: {
        to: s.notify_email,
        from: "Alertes POGI <alertes@notify.pogi-histoire.com>",
        sender_domain: "notify.pogi-histoire.com",
        subject,
        html,
        text: lines.join("\n"),
        purpose: "transactional",
        label: "site-health-alert",
        message_id: crypto.randomUUID(),
        queued_at: new Date().toISOString(),
      },
    } as any);
  } catch (e) {
    console.error("Health alert email could not be queued", e);
  }
}

/** Crawl the live site, detect breakage, persist state, raise alerts + email. */
export async function runSiteHealthCheck(trigger: "cron" | "manual" = "cron") {
  const startedAt = Date.now();
  const { data: run } = await supabaseAdmin
    .from("site_health_runs" as any)
    .insert({ trigger })
    .select("id")
    .single();
  const runId = (run as any)?.id as string | undefined;

  try {
    const pages = await listSiteUrls();
    const checks: HealthCheck[] = [];
    let homeHtml: string | undefined;

    for (const p of pages) {
      const { check, html } = await checkPage(p.url, p.label);
      checks.push(check);
      if (p.url === `${SITE_URL}/`) homeHtml = html;
    }

    checks.push(
      await checkAsset(`${SITE_URL}/sitemap.xml`, "Sitemap", (b) =>
        b.includes("<urlset") || b.includes("<sitemapindex") ? null : "Sitemap invalide",
      ),
    );
    checks.push(
      await checkAsset(`${SITE_URL}/robots.txt`, "robots.txt", (b) =>
        b.toLowerCase().includes("user-agent") ? null : "robots.txt invalide",
      ),
    );

    if (homeHtml) {
      for (const img of extractImages(homeHtml)) checks.push(await checkImage(img));
    }

    checks.push(await checkDatabase());

    // --- Compare with previous state ---
    const { data: previousRows } = await supabaseAdmin
      .from("site_health_checks" as any)
      .select("target,status,failing_since,last_ok_at");
    const previous = new Map<
      string,
      { status: string; failing_since: string | null; last_ok_at: string | null }
    >();
    for (const r of (previousRows as any[]) ?? [])
      previous.set(r.target, {
        status: r.status,
        failing_since: r.failing_since,
        last_ok_at: r.last_ok_at,
      });

    const now = new Date().toISOString();
    const broke: HealthCheck[] = [];
    const recovered: HealthCheck[] = [];
    const rows = checks.map((c) => {
      const before = previous.get(c.target);
      if (c.status === "fail" && before?.status !== "fail") broke.push(c);
      if (c.status === "ok" && before?.status === "fail") recovered.push(c);
      return {
        target: c.target,
        kind: c.kind,
        label: c.label,
        status: c.status,
        http_status: c.http_status,
        response_ms: c.response_ms,
        detail: c.detail,
        checked_at: now,
        last_ok_at: c.status === "ok" ? now : (before?.last_ok_at ?? null),

        failing_since:
          c.status === "fail" ? (before?.failing_since ?? now) : null,
      };
    });

    await supabaseAdmin.from("site_health_checks" as any).upsert(rows, { onConflict: "target" });

    const alerts = [
      ...broke.map((c) => ({
        level: "error",
        kind: "health",
        target: c.target,
        title: `Cassé : ${c.label}`,
        detail: c.detail ?? "Ressource indisponible",
      })),
      ...recovered.map((c) => ({
        level: "info",
        kind: "health",
        target: c.target,
        title: `Rétabli : ${c.label}`,
        detail: "La ressource répond de nouveau normalement.",
      })),
    ];
    if (alerts.length) {
      await supabaseAdmin.from("seo_alerts" as any).insert(alerts);
    }

    if (broke.length) {
      await notifyByEmail(
        `🚨 ${broke.length} problème(s) détecté(s) sur pogi-histoire`,
        broke.map((c) => `<strong>${c.label}</strong> — ${c.detail ?? "indisponible"} (${c.target})`),
      );
    } else if (recovered.length) {
      await notifyByEmail(
        `✅ Site rétabli (${recovered.length} élément(s))`,
        recovered.map((c) => `<strong>${c.label}</strong> répond de nouveau (${c.target})`),
      );
    }

    const failed = checks.filter((c) => c.status === "fail").length;
    if (runId) {
      await supabaseAdmin
        .from("site_health_runs" as any)
        .update({
          finished_at: new Date().toISOString(),
          ok: failed === 0,
          checks_total: checks.length,
          checks_ok: checks.length - failed,
          checks_failed: failed,
          duration_ms: Date.now() - startedAt,
          message: failed === 0 ? "Tout fonctionne" : `${failed} élément(s) en échec`,
        })
        .eq("id", runId);
    }

    return {
      ok: failed === 0,
      runId,
      total: checks.length,
      failed,
      broke: broke.length,
      recovered: recovered.length,
      checkedAt: now,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    if (runId) {
      await supabaseAdmin
        .from("site_health_runs" as any)
        .update({
          finished_at: new Date().toISOString(),
          ok: false,
          duration_ms: Date.now() - startedAt,
          message,
        })
        .eq("id", runId);
    }
    await supabaseAdmin.from("seo_alerts" as any).insert({
      level: "error",
      kind: "health",
      title: "Échec du contrôle de santé du site",
      detail: message,
    });
    return { ok: false, runId, error: message };
  }
}
