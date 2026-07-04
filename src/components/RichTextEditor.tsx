import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon,
  Video, Code, BookOpen, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Undo, Redo,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
};

const BLOCKS = [
  { value: "p", label: "Normal" },
  { value: "h1", label: "Titre 1" },
  { value: "h2", label: "Titre 2" },
  { value: "h3", label: "Titre 3" },
  { value: "h4", label: "Titre 4" },
  { value: "pre", label: "Code" },
];
const SIZES = [
  { value: "1", label: "Très petit" },
  { value: "2", label: "Petit" },
  { value: "3", label: "Normal" },
  { value: "4", label: "Moyen" },
  { value: "5", label: "Grand" },
  { value: "6", label: "Très grand" },
  { value: "7", label: "Énorme" },
];
const FONTS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Courier New', monospace", label: "Courier" },
];

export default function RichTextEditor({ value, onChange, minHeight = 380 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [block, setBlock] = useState("p");

  // Sync external value -> editor (only when different to avoid caret jumps)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  }

  function handleLink() {
    const url = prompt("URL du lien :", "https://");
    if (url) exec("createLink", url);
  }
  function handleImage() {
    const url = prompt("URL de l'image :", "https://");
    if (url) exec("insertImage", url);
  }
  function handleVideo() {
    const url = prompt("URL d'intégration vidéo (YouTube embed, mp4…) :", "https://");
    if (!url) return;
    let parsed: URL;
    try { parsed = new URL(url); } catch { alert("URL invalide."); return; }
    if (parsed.protocol !== "https:") { alert("Seules les URLs https:// sont autorisées."); return; }
    const safe = parsed.toString()
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<div class="my-3"><iframe src="${safe}" class="w-full aspect-video rounded" frameborder="0" allowfullscreen></iframe></div>`;
    exec("insertHTML", html);
  }

  function handleReadMore() {
    exec("insertHTML", '<hr data-readmore="true" class="my-4 border-pogi-yellow" /><p><em>Lire la suite…</em></p>');
  }
  function handleCode() {
    exec("formatBlock", "pre");
    setBlock("pre");
  }
  function handleHr() { exec("insertHorizontalRule"); }
  function handleQuote() { exec("formatBlock", "blockquote"); }

  const Btn = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title}
      className={`w-8 h-8 grid place-items-center rounded hover:bg-white/10 text-white/80 hover:text-white ${active ? "bg-white/10 text-pogi-yellow" : ""}`}>
      {children}
    </button>
  );
  const Sep = () => <span className="w-px h-5 bg-white/10 mx-1" />;

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-white/10 bg-pogi-dark/60 sticky top-0 z-10">
        <Btn onClick={() => exec("bold")} title="Gras (Ctrl+B)"><Bold size={16} /></Btn>
        <Btn onClick={() => exec("italic")} title="Italique (Ctrl+I)"><Italic size={16} /></Btn>
        <Btn onClick={() => exec("underline")} title="Souligné"><Underline size={16} /></Btn>
        <Btn onClick={() => exec("strikeThrough")} title="Barré"><Strikethrough size={16} /></Btn>
        <Sep />
        <Btn onClick={handleLink} title="Lien"><LinkIcon size={16} /></Btn>
        <Btn onClick={handleImage} title="Image"><ImageIcon size={16} /></Btn>
        <Btn onClick={handleVideo} title="Vidéo"><Video size={16} /></Btn>
        <Btn onClick={handleCode} title="Code"><Code size={16} /></Btn>
        <Btn onClick={handleReadMore} title="Lire la suite"><BookOpen size={16} /></Btn>
        <Sep />
        <select value={block} onChange={(e) => { setBlock(e.target.value); exec("formatBlock", e.target.value); }}
          className="bg-white/5 border border-white/10 text-white text-xs rounded px-2 py-1 h-8 focus:outline-none focus:border-pogi-yellow">
          {BLOCKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        <select onChange={(e) => { if (e.target.value) { exec("fontName", e.target.value); e.target.value = ""; } }} defaultValue=""
          className="bg-white/5 border border-white/10 text-white text-xs rounded px-2 py-1 h-8 focus:outline-none focus:border-pogi-yellow">
          <option value="" disabled>Police</option>
          {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select onChange={(e) => { if (e.target.value) { exec("fontSize", e.target.value); e.target.value = ""; } }} defaultValue=""
          className="bg-white/5 border border-white/10 text-white text-xs rounded px-2 py-1 h-8 focus:outline-none focus:border-pogi-yellow">
          <option value="" disabled>Taille</option>
          {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="w-8 h-8 grid place-items-center rounded hover:bg-white/10 cursor-pointer" title="Couleur du texte">
          <span className="block w-4 h-4 rounded border border-white/30" style={{ background: "linear-gradient(135deg,#F5C800,#1A1AC8)" }} />
          <input type="color" className="hidden" onChange={(e) => exec("foreColor", e.target.value)} />
        </label>
        <Sep />
        <Btn onClick={() => exec("justifyLeft")} title="Aligner à gauche"><AlignLeft size={16} /></Btn>
        <Btn onClick={() => exec("justifyCenter")} title="Centrer"><AlignCenter size={16} /></Btn>
        <Btn onClick={() => exec("justifyRight")} title="Aligner à droite"><AlignRight size={16} /></Btn>
        <Btn onClick={() => exec("justifyFull")} title="Justifier"><AlignJustify size={16} /></Btn>
        <Sep />
        <Btn onClick={() => exec("insertUnorderedList")} title="Liste à puces"><List size={16} /></Btn>
        <Btn onClick={() => exec("insertOrderedList")} title="Liste numérotée"><ListOrdered size={16} /></Btn>
        <Btn onClick={handleQuote} title="Citation"><Quote size={16} /></Btn>
        <Btn onClick={handleHr} title="Séparateur"><Minus size={16} /></Btn>
        <Sep />
        <Btn onClick={() => exec("undo")} title="Annuler"><Undo size={16} /></Btn>
        <Btn onClick={() => exec("redo")} title="Refaire"><Redo size={16} /></Btn>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onBlur={() => onChange(ref.current?.innerHTML ?? "")}
        className="prose prose-invert max-w-none p-5 focus:outline-none text-white/90 leading-relaxed"
        style={{ minHeight }}
      />
      <style>{`
        [contenteditable] h1{font-size:2rem;font-weight:700;margin:.6em 0}
        [contenteditable] h2{font-size:1.5rem;font-weight:700;margin:.6em 0}
        [contenteditable] h3{font-size:1.25rem;font-weight:600;margin:.5em 0}
        [contenteditable] h4{font-size:1.1rem;font-weight:600;margin:.5em 0}
        [contenteditable] p{margin:.5em 0}
        [contenteditable] ul{list-style:disc;padding-left:1.5rem;margin:.5em 0}
        [contenteditable] ol{list-style:decimal;padding-left:1.5rem;margin:.5em 0}
        [contenteditable] blockquote{border-left:3px solid #F5C800;padding-left:1rem;color:#ffffffcc;font-style:italic;margin:.7em 0}
        [contenteditable] pre{background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.1);padding:.75rem;border-radius:.375rem;font-family:ui-monospace,Menlo,monospace;font-size:.9em;overflow:auto}
        [contenteditable] a{color:#F5C800;text-decoration:underline}
        [contenteditable] img{max-width:100%;height:auto;border-radius:.375rem;margin:.5em 0}
      `}</style>
    </div>
  );
}
