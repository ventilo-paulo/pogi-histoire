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
  redirect_chain?: string | null;
  response_bytes?: number | null;
  snapshot_url?: string | null;
};

/** Free, no-key thumbnail service used to illustrate a failing page. */
function snapshotUrl(url: string) {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=480&h=320`;
}


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

function extractImages(html: string, base: string = SITE_URL, max = 8) {
  const canonicalHost = new URL(SITE_URL).host;
  const add = (raw: string, set: Set<string>) => {
    try {
      const u = new URL(raw, base);
      // Canonical-domain assets are the same files as on the monitored origin.
      if (u.host === canonicalHost) set.add(`${base}${u.pathname}${u.search}`);
      else set.add(u.href);
    } catch {
      /* ignore malformed src */
    }
  };
  const urls = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.size < max) {
    const raw = m[1];
    if (raw.startsWith("data:")) continue;
    add(raw, urls);
  }
  const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (og) add(og[1], urls);
  return [...urls];
}

async function checkPage(url: string, label: string): Promise<{ check: HealthCheck; html?: string }> {
  const hops: string[] = [];
  let current = url;
  let totalMs = 0;

  try {
    for (let i = 0; i < 5; i++) {
      const { res, ms } = await timedFetch(current);
      totalMs += ms;

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        hops.push(`${res.status} ${current} → ${location ?? "?"}`);
        if (!location) break;
        current = new URL(location, current).href;
        continue;
      }

      const chain = hops.length ? hops.join("\n") : null;

      if (!res.ok) {
        return {
          check: {
            target: url,
            kind: "page",
            label,
            status: "fail",
            http_status: res.status,
            response_ms: totalMs,
            detail: `Le serveur répond ${res.status} (${res.statusText || "erreur"})`,
            redirect_chain: chain,
            response_bytes: null,
            snapshot_url: snapshotUrl(url),
          },
        };
      }

      const html = await res.text();
      const bytes = new TextEncoder().encode(html).length;
      const problems = inspectHtml(html);
      // A redirected canonical URL is itself a problem for SEO/monitoring.
      if (hops.length) problems.unshift(`redirection ${hops.length > 1 ? "en chaîne " : ""}avant réponse`);
      const failed = problems.length > 0;

      return {
        check: {
          target: url,
          kind: "page",
          label,
          status: failed ? "fail" : "ok",
          http_status: res.status,
          response_ms: totalMs,
          detail: failed ? problems.join(", ") : null,
          redirect_chain: chain,
          response_bytes: bytes,
          snapshot_url: failed ? snapshotUrl(url) : null,
        },
        html: hops.length ? undefined : html,
      };
    }

    return {
      check: {
        target: url,
        kind: "page",
        label,
        status: "fail",
        http_status: null,
        response_ms: totalMs,
        detail: "Boucle de redirection (plus de 5 sauts)",
        redirect_chain: hops.join("\n"),
        response_bytes: null,
        snapshot_url: snapshotUrl(url),
      },
    };
  } catch (e) {
    return {
      check: {
        target: url,
        kind: "page",
        label,
        status: "fail",
        http_status: null,
        response_ms: totalMs || null,
        detail: e instanceof Error ? `Page injoignable : ${e.message}` : "Page injoignable",
        redirect_chain: hops.length ? hops.join("\n") : null,
        response_bytes: null,
        snapshot_url: snapshotUrl(url),
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
      response_bytes: new TextEncoder().encode(body).length,
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
    const len = res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length");
    return {
      target: url,
      kind: "image",
      label: url.split("/").pop() ?? url,
      status: ok ? "ok" : "fail",
      http_status: res.status,
      response_ms: ms,
      detail: ok ? null : `Image cassée (${res.status})`,
      response_bytes: len && /^\d+$/.test(len) ? Number(len) : null,
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

function formatBytes(n?: number | null) {
  if (!n && n !== 0) return null;
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

/** Human diagnosis: cause + HTTP code + redirect chain + response size. */
export function describeCheck(c: HealthCheck) {
  const parts: string[] = [c.detail ?? "Indisponible"];
  parts.push(`HTTP ${c.http_status ?? "aucune réponse"}`);
  if (c.response_ms != null) parts.push(`${c.response_ms} ms`);
  const size = formatBytes(c.response_bytes);
  if (size) parts.push(`${size} reçus`);
  if (c.redirect_chain) parts.push(`redirections : ${c.redirect_chain.replace(/\n/g, " | ")}`);
  return parts.join(" · ");
}

function checkEmailBlock(c: HealthCheck) {
  const thumb = c.snapshot_url
    ? `<div style="margin:8px 0"><img src="${c.snapshot_url}" alt="Aperçu de ${c.label}" width="240" style="border-radius:8px;border:1px solid #ddd"/></div>`
    : "";
  return `<li style="margin-bottom:14px">
      <strong>${c.label}</strong> — ${c.detail ?? "indisponible"}<br/>
      <span style="color:#555;font-size:13px">
        HTTP ${c.http_status ?? "aucune réponse"}${c.response_ms != null ? ` · ${c.response_ms} ms` : ""}${formatBytes(c.response_bytes) ? ` · ${formatBytes(c.response_bytes)}` : ""}
      </span><br/>
      ${c.redirect_chain ? `<span style="color:#555;font-size:13px">Redirections : ${c.redirect_chain.replace(/\n/g, "<br/>")}</span><br/>` : ""}
      <a href="${c.target}" style="font-size:13px">${c.target}</a>
      ${thumb}
    </li>`;
}

async function notifyByEmail(subject: string, lines: string[], label = "site-health-alert") {
  const { data: settings } = await supabaseAdmin
    .from("site_health_settings" as any)
    .select("email_enabled,notify_email")
    .maybeSingle();
  const s = settings as any;
  if (!s?.email_enabled || !s?.notify_email) return;

  const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6">
    <h2 style="margin:0 0 12px">${subject}</h2>
    <ul style="padding-left:18px">${lines.join("")}</ul>
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
        text: lines.join("\n").replace(/<[^>]+>/g, " "),
        purpose: "transactional",
        label,
        message_id: msgId,
        idempotency_key: msgId,
        queued_at: new Date().toISOString(),
      },
    } as any);
  } catch (e) {
    console.error("Health alert email could not be queued", e);
  }
}


/** Origin actually crawled: configurable in Admin > Santé, defaults to SITE_URL. */
async function resolveMonitorBase() {
  const { data } = await supabaseAdmin
    .from("site_health_settings" as any)
    .select("monitor_base_url")
    .maybeSingle();
  const raw = (data as any)?.monitor_base_url as string | null | undefined;
  if (!raw) return SITE_URL.replace(/\/$/, "");
  try {
    return new URL(raw).origin;
  } catch {
    return SITE_URL.replace(/\/$/, "");
  }
}

/** Move a canonical site URL onto the monitored origin. */
function rebase(url: string, base: string) {
  try {
    const u = new URL(url);
    return `${base}${u.pathname}${u.search}`;
  } catch {
    return url;
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
    const base = await resolveMonitorBase();
    const pages = (await listSiteUrls()).map((p) => ({ ...p, url: rebase(p.url, base) }));
    const checks: HealthCheck[] = [];
    let homeHtml: string | undefined;

    for (const p of pages) {
      const { check, html } = await checkPage(p.url, p.label);
      checks.push(check);
      if (p.url === `${base}/`) homeHtml = html;
    }

    checks.push(
      await checkAsset(`${base}/sitemap.xml`, "Sitemap", (b) =>
        b.includes("<urlset") || b.includes("<sitemapindex") ? null : "Sitemap invalide",
      ),
    );
    checks.push(
      await checkAsset(`${base}/robots.txt`, "robots.txt", (b) =>
        b.toLowerCase().includes("user-agent") ? null : "robots.txt invalide",
      ),
    );

    if (homeHtml) {
      for (const img of extractImages(homeHtml, base)) checks.push(await checkImage(img));
    }

    checks.push(await checkDatabase());

    // Drop stale rows pointing at a previously monitored origin so the
    // dashboard only reflects the site currently being watched.
    const keep = new Set(checks.map((c) => c.target));
    const { data: staleRows } = await supabaseAdmin
      .from("site_health_checks" as any)
      .select("target");
    const stale = ((staleRows as any[]) ?? [])
      .map((r) => r.target as string)
      .filter((t) => !keep.has(t) && /^https?:\/\//i.test(t));
    if (stale.length) {
      await supabaseAdmin.from("site_health_checks" as any).delete().in("target", stale);
    }

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
        redirect_chain: c.redirect_chain ?? null,
        response_bytes: c.response_bytes ?? null,
        snapshot_url: c.status === "fail" ? (c.snapshot_url ?? null) : null,
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
        detail: describeCheck(c),
      })),
      ...recovered.map((c) => ({
        level: "info",
        kind: "health",
        target: c.target,
        title: `Rétabli : ${c.label}`,
        detail: `La ressource répond de nouveau normalement · HTTP ${c.http_status ?? "OK"}${c.response_ms != null ? ` · ${c.response_ms} ms` : ""}`,
      })),
    ];
    if (alerts.length) {
      await supabaseAdmin.from("seo_alerts" as any).insert(alerts);
    }

    if (broke.length) {
      await notifyByEmail(
        `🚨 ${broke.length} problème(s) détecté(s) sur pogi-histoire`,
        broke.map(checkEmailBlock),
      );
    } else if (recovered.length) {
      await notifyByEmail(
        `✅ Site rétabli (${recovered.length} élément(s))`,
        recovered.map(
          (c) => `<li><strong>${c.label}</strong> répond de nouveau (HTTP ${c.http_status ?? "OK"}) — ${c.target}</li>`,
        ),
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

/** Daily digest: number of checks, errors detected and items recovered over 24h. */
export async function runDailyHealthSummary() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: settings } = await supabaseAdmin
    .from("site_health_settings" as any)
    .select("daily_summary_enabled,email_enabled,notify_email")
    .maybeSingle();
  const s = settings as any;
  if (!s?.daily_summary_enabled || !s?.email_enabled || !s?.notify_email) {
    return { ok: true, skipped: "daily summary disabled" };
  }

  const [{ data: runs }, { data: alerts }, { data: current }] = await Promise.all([
    supabaseAdmin.from("site_health_runs" as any).select("*").gte("started_at", since),
    supabaseAdmin
      .from("seo_alerts" as any)
      .select("*")
      .eq("kind", "health")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("site_health_checks" as any).select("*"),
  ]);

  const runList = ((runs as any[]) ?? []).filter((r) => r.finished_at);
  const checksTotal = runList.reduce((n, r) => n + (r.checks_total ?? 0), 0);
  const alertList = (alerts as any[]) ?? [];
  const errors = alertList.filter((a) => a.level === "error");
  const recovered = alertList.filter((a) => a.level === "info");
  const failing = ((current as any[]) ?? []).filter((c) => c.status === "fail");

  const lines: string[] = [
    `<li><strong>${runList.length}</strong> contrôle(s) automatique(s) exécuté(s), <strong>${checksTotal}</strong> vérification(s) au total</li>`,
    `<li><strong>${errors.length}</strong> problème(s) détecté(s) sur 24 h</li>`,
    `<li><strong>${recovered.length}</strong> élément(s) rétabli(s)</li>`,
    `<li><strong>${failing.length}</strong> élément(s) actuellement en échec</li>`,
  ];

  for (const c of failing) {
    lines.push(
      checkEmailBlock({
        target: c.target,
        kind: c.kind,
        label: c.label,
        status: "fail",
        http_status: c.http_status,
        response_ms: c.response_ms,
        detail: c.detail,
        redirect_chain: c.redirect_chain,
        response_bytes: c.response_bytes,
        snapshot_url: c.snapshot_url,
      }),
    );
  }
  for (const a of recovered) {
    lines.push(`<li>✅ ${a.title} — ${a.detail ?? ""}</li>`);
  }

  const subject = failing.length
    ? `📋 Récapitulatif quotidien — ${failing.length} problème(s) en cours`
    : `📋 Récapitulatif quotidien — tout fonctionne`;

  await notifyByEmail(subject, lines, "site-health-daily-summary");

  await supabaseAdmin
    .from("site_health_settings" as any)
    .update({ last_daily_summary_at: new Date().toISOString() })
    .eq("id", true);

  return {
    ok: true,
    runs: runList.length,
    checks: checksTotal,
    errors: errors.length,
    recovered: recovered.length,
    failing: failing.length,
  };
}
