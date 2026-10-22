import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, History, Lightbulb, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { editorialOverview, generateAngles } from "@/lib/editorial.functions";

export const Route = createFileRoute("/admin/idees")({
  head: () => ({ meta: [{ title: "Idées d'articles — Back office POGI" }, { name: "robots", content: "noindex" }] }),
  component: IdeasPage,
});

type Status = "idee" | "en_cours" | "traite";
type Topic = { id: string; title: string; notes: string | null; status: Status; created_at: string };
type Angle = {
  title: string;
  hook: string;
  angle: string;
  why: string;
  period: string;
  format: "article" | "video" | "article_et_video";
  priority: "haute" | "moyenne" | "basse";
  keywords: string[];
  relatedArticle: string | null;
  category: string | null;
};
type Run = {
  id: string;
  created_at: string;
  focus: string | null;
  angles: Angle[];
  context: { summary?: string; articles?: number; topics?: number; pageViews90d?: number; googleQueries?: number };
};
type Overview = Awaited<ReturnType<typeof editorialOverview>>;

const STATUS_LABEL: Record<Status, string> = {
  idee: "Idée",
  en_cours: "En cours d'écriture",
  traite: "Déjà traité",
};
const FORMAT_LABEL: Record<Angle["format"], string> = {
  article: "Article",
  video: "Vidéo",
  article_et_video: "Article + vidéo",
};
const PRIORITY_CLASS: Record<Angle["priority"], string> = {
  haute: "bg-pogi-yellow text-pogi-dark",
  moyenne: "bg-white/15 text-white",
  basse: "bg-white/5 text-white/60",
};

const input =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-pogi-yellow/60";

function IdeasPage() {
  const runAi = useServerFn(generateAngles);
  const getOverview = useServerFn(editorialOverview);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [current, setCurrent] = useState<Run | null>(null);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idee");
  const [saving, setSaving] = useState(false);

  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function loadTopics() {
    const { data, error } = await supabase
      .from("editorial_topics")
      .select("id,title,notes,status,created_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setTopics((data ?? []) as Topic[]);
  }

  async function loadRuns() {
    const { data } = await supabase
      .from("editorial_angle_runs")
      .select("id,created_at,focus,angles,context")
      .order("created_at", { ascending: false })
      .limit(20);
    const list = (data ?? []) as unknown as Run[];
    setRuns(list);
    setCurrent((c) => c ?? list[0] ?? null);
  }

  useEffect(() => {
    loadTopics();
    loadRuns();
    getOverview()
      .then(setOverview)
      .catch(() => setOverview(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("editorial_topics").insert({
      title: title.trim(),
      notes: notes.trim() || null,
      status,
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) return setError(error.message);
    setTitle("");
    setNotes("");
    setStatus("idee");
    loadTopics();
  }

  async function updateStatus(t: Topic, s: Status) {
    setTopics((list) => list.map((x) => (x.id === t.id ? { ...x, status: s } : x)));
    const { error } = await supabase.from("editorial_topics").update({ status: s }).eq("id", t.id);
    if (error) {
      setError(error.message);
      loadTopics();
    }
  }

  async function removeTopic(t: Topic) {
    if (!confirm(`Supprimer le sujet « ${t.title} » ?`)) return;
    const { error } = await supabase.from("editorial_topics").delete().eq("id", t.id);
    if (error) return setError(error.message);
    loadTopics();
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const run = (await runAi({ data: { focus } })) as unknown as Run;
      setCurrent(run);
      setRuns((list) => [run, ...list.filter((r) => r.id !== run.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  }

  async function keepAngle(a: Angle) {
    const { data: u } = await supabase.auth.getUser();
    const lines = [
      a.hook,
      "",
      a.angle,
      "",
      `Pourquoi : ${a.why}`,
      `Époque : ${a.period} · Format : ${FORMAT_LABEL[a.format]}`,
      a.keywords.length ? `Recherches Google visées : ${a.keywords.join(", ")}` : "",
      a.relatedArticle ? `À relier à : ${a.relatedArticle}` : "",
    ].filter((l, i, arr) => l !== "" || (arr[i - 1] ?? "") !== "");
    const { error } = await supabase.from("editorial_topics").insert({
      title: a.title,
      notes: lines.join("\n").trim(),
      status: "idee",
      created_by: u.user?.id ?? null,
    });
    if (error) return setError(error.message);
    setAdded((s) => new Set(s).add(a.title));
    loadTopics();
  }

  async function deleteRun(r: Run) {
    if (!confirm("Supprimer cette proposition de l'historique ?")) return;
    await supabase.from("editorial_angle_runs").delete().eq("id", r.id);
    setRuns((list) => list.filter((x) => x.id !== r.id));
    if (current?.id === r.id) setCurrent(null);
  }

  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-white flex items-center gap-3">
        <Lightbulb className="text-pogi-yellow" /> Idées d'articles
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-white/55">
        Notez ici vos sujets : idées, articles en cours et sujets déjà traités ailleurs (vidéos, autres médias). L'IA s'en sert,
        avec les articles publiés et les statistiques du site, pour proposer des angles qui peuvent attirer des lecteurs.
      </p>

      {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200">{error}</p>}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,420px)_1fr]">
        {/* Topics */}
        <section className="space-y-4">
          <h2 className="font-display text-xl uppercase text-white">Nos sujets</h2>
          <form onSubmit={addTopic} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <input
              className={input}
              placeholder="Sujet ou titre (ex. Le procès de Jeanne d'Arc)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              aria-label="Sujet"
            />
            <textarea
              className={`${input} min-h-[70px]`}
              placeholder="Notes : angle envisagé, sources, lien vidéo… (facultatif)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              aria-label="Notes"
            />
            <div className="flex gap-2">
              <select
                className={`${input} flex-1`}
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                aria-label="Statut"
              >
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                  <option key={s} value={s} className="bg-pogi-dark">
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-pogi-yellow px-4 text-sm font-semibold text-pogi-dark disabled:opacity-50"
              >
                <Plus size={15} /> Ajouter
              </button>
            </div>
          </form>

          {topics.length === 0 ? (
            <p className="text-sm text-white/45">Aucun sujet noté pour l'instant.</p>
          ) : (
            <ul className="space-y-2">
              {topics.map((t) => (
                <li key={t.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white">{t.title}</p>
                    <button
                      onClick={() => removeTopic(t)}
                      aria-label={`Supprimer ${t.title}`}
                      className="text-white/35 hover:text-red-300 shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {t.notes && <p className="mt-1 whitespace-pre-line text-xs text-white/55 line-clamp-4">{t.notes}</p>}
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t, e.target.value as Status)}
                    aria-label="Statut du sujet"
                    className="mt-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
                  >
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                      <option key={s} value={s} className="bg-pogi-dark">
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}

          {overview && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/65">
              <p className="font-semibold text-white">Pris en compte automatiquement</p>
              <ul className="mt-2 space-y-1">
                {overview.articles.map((a) => (
                  <li key={a.title} className="flex justify-between gap-3">
                    <span className="truncate">{a.title}</span>
                    <span className="shrink-0 text-white/40">{a.views} vues</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/45">
                {overview.videos} vidéo(s) · {overview.pageViews} pages vues sur 90 jours ·{" "}
                {overview.googleQueries.length
                  ? `${overview.googleQueries.length} requêtes Google suivies`
                  : "pas encore de requêtes Google"}
                {overview.siteSearches.length
                  ? ` · recherches sur le site : ${overview.siteSearches.map((s) => s.key).join(", ")}`
                  : ""}
              </p>
            </div>
          )}
        </section>

        {/* AI proposals */}
        <section className="min-w-0 space-y-4">
          <h2 className="font-display text-xl uppercase text-white flex items-center gap-2">
            <Sparkles size={18} className="text-pogi-yellow" /> Angles proposés par l'IA
          </h2>
          <div className="rounded-xl border border-pogi-yellow/30 bg-pogi-yellow/[0.04] p-4">
            <label htmlFor="focus" className="text-sm text-white/70">
              Piste à explorer (facultatif)
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="focus"
                className={input}
                placeholder="Ex. la guerre froide, des femmes oubliées, l'Afrique au XIXe siècle…"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                maxLength={500}
                disabled={generating}
              />
              <button
                onClick={generate}
                disabled={generating}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-pogi-yellow px-5 py-2 text-sm font-semibold text-pogi-dark disabled:opacity-60"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? "Analyse en cours…" : "Proposer des angles"}
              </button>
            </div>
            {generating && (
              <p className="mt-2 text-xs text-white/50">
                L'IA lit vos sujets, vos articles et vos statistiques. Cela prend en général 30 secondes à 1 minute.
              </p>
            )}
          </div>

          {current ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Proposition du {new Date(current.created_at).toLocaleString("fr-FR")}
                  {current.focus ? ` · piste : ${current.focus}` : ""}
                </p>
              </div>
              {current.context?.summary && (
                <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">
                  {current.context.summary}
                </p>
              )}
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {current.angles.map((a) => (
                  <article key={a.title} className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider">
                      <span className={`rounded px-2 py-0.5 font-bold ${PRIORITY_CLASS[a.priority]}`}>
                        Priorité {a.priority}
                      </span>
                      <span className="text-white/45">{FORMAT_LABEL[a.format]}</span>
                      <span className="text-white/45">· {a.period}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold leading-snug text-white">{a.title}</h3>
                    <p className="mt-2 text-sm italic text-white/75">{a.hook}</p>
                    <p className="mt-2 text-sm text-white/65">{a.angle}</p>
                    <p className="mt-3 text-sm text-white/65">
                      <span className="font-semibold text-pogi-yellow">Pourquoi ça peut marcher : </span>
                      {a.why}
                    </p>
                    {a.keywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {a.keywords.map((k) => (
                          <span key={k} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    {(a.relatedArticle || a.category) && (
                      <p className="mt-3 text-xs text-white/45">
                        {a.category ? `Catégorie : ${a.category}` : ""}
                        {a.category && a.relatedArticle ? " · " : ""}
                        {a.relatedArticle ? `À relier à : ${a.relatedArticle}` : ""}
                      </p>
                    )}
                    <div className="mt-auto pt-4">
                      {added.has(a.title) ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
                          <Check size={15} /> Ajouté à nos sujets
                        </span>
                      ) : (
                        <button
                          onClick={() => keepAngle(a)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-pogi-yellow/50 px-3 py-1.5 text-sm text-pogi-yellow hover:bg-pogi-yellow/10"
                        >
                          <Plus size={14} /> Ajouter à nos sujets
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            !generating && (
              <p className="text-sm text-white/45">
                Aucune proposition pour l'instant. Cliquez sur « Proposer des angles » pour obtenir 6 idées.
              </p>
            )
          )}

          {runs.length > 1 && (
            <div className="pt-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/60">
                <History size={15} /> Propositions précédentes
              </h3>
              <ul className="mt-2 divide-y divide-white/5 rounded-lg border border-white/10">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <button
                      onClick={() => setCurrent(r)}
                      className={`truncate text-left hover:text-pogi-yellow ${current?.id === r.id ? "text-pogi-yellow" : "text-white/70"}`}
                    >
                      {new Date(r.created_at).toLocaleString("fr-FR")} · {r.angles.length} angles
                      {r.focus ? ` · ${r.focus}` : ""}
                    </button>
                    <button onClick={() => deleteRun(r)} aria-label="Supprimer cette proposition" className="text-white/30 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
