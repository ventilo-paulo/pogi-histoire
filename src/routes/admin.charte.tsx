import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/charte")({
  head: () => ({ meta: [{ title: "Charte — Admin POGI", name: "robots", content: "noindex" }] }),
  component: ChartePage,
});

type Row = {
  key: string;
  label: string;
  font: string;
  sizePt: string;
  sizePx: string;
  lineHeight: string;
  notes?: string;
  preview: React.ReactNode;
};

const rows: Row[] = [
  {
    key: "h1",
    label: "Titre d'article (H1)",
    font: "Bebas Neue (display condensée)",
    sizePt: "20 pt",
    sizePx: "27 px",
    lineHeight: "1.1",
    notes: "Majuscules, letter-spacing 0.02em",
    preview: <h1>Versailles ou la mise en scène du pouvoir absolu</h1>,
  },
  {
    key: "h2",
    label: "Intertitre H2",
    font: "Bebas Neue",
    sizePt: "16 pt",
    sizePx: "21 px",
    lineHeight: "1.1",
    notes: "Marge haute 40 px, basse 14 px",
    preview: <h2>Un enfant humilié, un roi obsédé</h2>,
  },
  {
    key: "h3",
    label: "Intertitre H3",
    font: "Bebas Neue",
    sizePt: "14 pt",
    sizePx: "19 px",
    lineHeight: "1.1",
    notes: "Marge haute 30 px, basse 10 px",
    preview: <h3>Voler les artistes du vaincu</h3>,
  },
  {
    key: "h4",
    label: "Intertitre H4",
    font: "Bebas Neue",
    sizePt: "14 pt",
    sizePx: "19 px",
    lineHeight: "1.1",
    notes: "Même taille que H3, marges réduites",
    preview: <h4>Le protocole du lever</h4>,
  },
  {
    key: "body",
    label: "Corps de texte",
    font: "Inter (sans-serif)",
    sizePt: "12 pt",
    sizePx: "16 px",
    lineHeight: "1.75",
    notes: "Largeur max 720 px centrée, paragraphes espacés de 24 px",
    preview: (
      <>
        <p>
          Louis XIV bâtit Versailles comme un décor total : chaque allée, chaque miroir, chaque
          fontaine met en scène le pouvoir absolu du souverain.
        </p>
        <p>
          Les courtisans y jouent leur rôle, du lever au coucher du roi, dans un ballet réglé à
          la minute près.
        </p>
      </>
    ),
  },
  {
    key: "quote",
    label: "Citation",
    font: "Inter, italique",
    sizePt: "12 pt",
    sizePx: "16 px",
    lineHeight: "1.75",
    notes: "Bordure gauche jaune (4 px), padding gauche 20 px",
    preview: (
      <blockquote>
        « L'État, c'est moi. » — Louis XIV
      </blockquote>
    ),
  },
  {
    key: "caption",
    label: "Légende d'image",
    font: "Inter, italique",
    sizePt: "10,5 pt",
    sizePx: "14 px",
    lineHeight: "1.5",
    notes: "Centrée, gris #6B7280",
    preview: <p className="caption">Galerie des Glaces, château de Versailles — 1684.</p>,
  },
  {
    key: "list",
    label: "Listes (à puces / numérotées)",
    font: "Inter",
    sizePt: "12 pt",
    sizePx: "16 px",
    lineHeight: "1.75",
    preview: (
      <ul>
        <li>Symbole du pouvoir royal</li>
        <li>Modèle diplomatique</li>
        <li>Machine de communication politique</li>
      </ul>
    ),
  },
];


function ChartePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-white uppercase">Charte typographique</h1>
        <p className="text-white/60 mt-2 max-w-2xl">
          Cette charte s'applique automatiquement à tout le contenu des articles publiés sur le
          site public, et à l'éditeur du back office. Les polices et tailles saisies manuellement
          dans le WYSIWYG sont ignorées côté public pour garantir l'homogénéité.
        </p>
      </header>

      <div className="space-y-6">
        {rows.map((r) => (
          <section
            key={r.key}
            className="grid md:grid-cols-[280px_1fr] gap-6 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden"
          >
            <div className="p-5 border-b md:border-b-0 md:border-r border-white/10">
              <div className="text-xs uppercase tracking-wider text-pogi-yellow font-semibold">
                {r.key}
              </div>
              <div className="text-white font-semibold mt-1">{r.label}</div>
              <dl className="mt-4 space-y-2 text-sm">
                <Field label="Police" value={r.font} />
                <Field label="Taille (Word)" value={r.sizePt} />
                <Field label="Taille écran" value={r.sizePx} />

                <Field label="Interlignage" value={r.lineHeight} />
                {r.notes && <Field label="Notes" value={r.notes} />}
              </dl>
            </div>
            <div className="bg-white p-6 md:p-8">
              <div className="article-prose" style={{ maxWidth: "none" }}>
                {r.preview}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-white/50 min-w-[110px]">{label}</dt>
      <dd className="text-white/85">{value}</dd>
    </div>
  );
}
