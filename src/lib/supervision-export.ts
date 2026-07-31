/** Client-side export helpers (CSV + printable PDF) for the supervision history. */

export type ExportPayload = {
  from: string;
  to: string;
  healthRuns: any[];
  seoRuns: any[];
  alerts: any[];
};

const fmt = (d?: string | null) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(d);
  }
};

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const escHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

export function buildCsv(data: ExportPayload): string {
  const rows: string[][] = [];
  rows.push(["Type", "Date", "Déclencheur", "Statut", "Total", "Erreurs", "Détail"]);

  for (const r of data.healthRuns) {
    rows.push([
      "Contrôle santé",
      fmt(r.started_at),
      r.trigger === "manual" ? "manuel" : "auto",
      r.ok ? "OK" : "Incident",
      String(r.checks_total ?? ""),
      String(r.checks_failed ?? ""),
      r.message ?? "",
    ]);
  }
  for (const r of data.seoRuns) {
    rows.push([
      "Contrôle indexation",
      fmt(r.started_at),
      r.trigger === "manual" ? "manuel" : "auto",
      r.ok ? "OK" : "Incident",
      String(r.urls_total ?? ""),
      String(r.urls_error ?? ""),
      `sitemap: ${r.sitemap_status ?? "—"} · indexées: ${r.urls_indexed ?? 0} · en attente: ${r.urls_pending ?? 0}`,
    ]);
  }
  for (const a of data.alerts) {
    rows.push([
      `Incident (${a.kind === "health" ? "santé" : "indexation"})`,
      fmt(a.created_at),
      a.level ?? "",
      a.read_at ? "lu" : "non lu",
      "",
      "",
      [a.title, a.target, a.detail].filter(Boolean).join(" — "),
    ]);
  }

  return "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

export function downloadCsv(data: ExportPayload) {
  const blob = new Blob([buildCsv(data)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pogi-supervision_${data.from}_${data.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function table(head: string[], rows: string[][]) {
  if (!rows.length) return "<p class='empty'>Aucune donnée sur la période.</p>";
  return `<table><thead><tr>${head.map((h) => `<th>${escHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escHtml(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function openPdf(data: ExportPayload) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Supervision POGI ${escHtml(data.from)} — ${escHtml(data.to)}</title>
<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:32px;font-size:12px}
  h1{font-size:20px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em}
  h2{font-size:14px;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #ddd;padding-bottom:4px}
  .sub{color:#666;margin:0 0 8px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}
  th{background:#f4f4f4;font-size:11px;text-transform:uppercase}
  .empty{color:#777;font-style:italic}
  @page{margin:16mm}
</style></head><body>
<h1>Supervision du site — POGI Histoire</h1>
<p class="sub">Période du ${escHtml(data.from)} au ${escHtml(data.to)} · export généré le ${escHtml(fmt(new Date().toISOString()))}</p>
<p class="sub">${data.healthRuns.length} contrôle(s) de santé · ${data.seoRuns.length} contrôle(s) d'indexation · ${data.alerts.length} incident(s)</p>
<h2>Contrôles de santé</h2>
${table(
  ["Date", "Déclencheur", "Statut", "Contrôles", "Erreurs"],
  data.healthRuns.map((r) => [
    fmt(r.started_at),
    r.trigger === "manual" ? "manuel" : "auto",
    r.ok ? "OK" : "Incident",
    String(r.checks_total ?? ""),
    String(r.checks_failed ?? ""),
  ]),
)}
<h2>Contrôles d'indexation</h2>
${table(
  ["Date", "Déclencheur", "Sitemap", "URLs", "Indexées", "Erreurs"],
  data.seoRuns.map((r) => [
    fmt(r.started_at),
    r.trigger === "manual" ? "manuel" : "auto",
    r.sitemap_status ?? "—",
    String(r.urls_total ?? ""),
    String(r.urls_indexed ?? ""),
    String(r.urls_error ?? ""),
  ]),
)}
<h2>Incidents</h2>
${table(
  ["Date", "Type", "Niveau", "Intitulé", "Cible"],
  data.alerts.map((a) => [
    fmt(a.created_at),
    a.kind === "health" ? "santé" : "indexation",
    a.level ?? "",
    [a.title, a.detail].filter(Boolean).join(" — "),
    a.target ?? "",
  ]),
)}
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) throw new Error("Le navigateur a bloqué l'ouverture de la fenêtre d'impression.");
  w.document.write(html);
  w.document.close();
}
