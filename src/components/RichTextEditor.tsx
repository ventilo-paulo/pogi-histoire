import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon,
  Video, Code, BookOpen, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Undo, Redo, Type,
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
  function handleCode() { exec("formatBlock", "pre"); setBlock("pre"); }
  function handleHr() { exec("insertHorizontalRule"); }
  function handleQuote() { exec("formatBlock", "blockquote"); }

  const Btn = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-9 h-9 grid place-items-center rounded-md transition-colors text-white/85 hover:bg-white/10 hover:text-white active:bg-white/15 ${active ? "bg-white/15 text-pogi-yellow" : ""}`}
    >
      {children}
    </button>
  );

  const Group = ({ children, label }: { children: React.ReactNode; label?: string }) => (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 px-1.5 rounded-md bg-white/[0.03] border border-white/5"
    >
      {children}
    </div>
  );

  const Select = ({
    value: v, onChange: oc, title, children, minWidth,
  }: { value?: string; onChange: (v: string) => void; title: string; children: React.ReactNode; minWidth?: number }) => (
    <select
      title={title}
      aria-label={title}
      value={v}
      onChange={(e) => oc(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      className="bg-white/5 border border-white/10 text-white text-xs rounded-md px-2 h-9 focus:outline-none focus:border-pogi-yellow hover:bg-white/10 transition-colors"
      style={{ minWidth }}
    >
      {children}
    </select>
  );

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.03]">
      {/* Word / Google Docs style ribbon: grouped by function, sticky while scrolling long articles */}
      <div className="sticky top-0 z-20 bg-pogi-dark/95 backdrop-blur border-b border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          {/* Historique */}
          <Group label="Historique">
            <Btn onClick={() => exec("undo")} title="Annuler (Ctrl+Z)"><Undo size={18} /></Btn>
            <Btn onClick={() => exec("redo")} title="Refaire (Ctrl+Y)"><Redo size={18} /></Btn>
          </Group>

          {/* Style de paragraphe */}
          <Group label="Style">
            <Select
              title="Style de paragraphe"
              value={block}
              onChange={(v) => { setBlock(v); exec("formatBlock", v); }}
              minWidth={110}
            >
              {BLOCKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
            <Select
              title="Police"
              onChange={(v) => { if (v) exec("fontName", v); }}
              value=""
              minWidth={110}
            >
              <option value="" disabled>Police</option>
              {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
            <input
              type="number"
              min={1}
              max={100}
              defaultValue={16}
              onChange={(e) => handleFontSize(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs rounded-md px-2 h-9 w-16 focus:outline-none focus:border-pogi-yellow hover:bg-white/10 transition-colors"
              title="Taille de police (px)"
              aria-label="Taille de police (px)"
            />
          </Group>

          {/* Mise en forme du texte */}
          <Group label="Mise en forme du texte">
            <Btn onClick={() => exec("bold")} title="Gras (Ctrl+B)"><Bold size={18} /></Btn>
            <Btn onClick={() => exec("italic")} title="Italique (Ctrl+I)"><Italic size={18} /></Btn>
            <Btn onClick={() => exec("underline")} title="Souligné (Ctrl+U)"><Underline size={18} /></Btn>
            <Btn onClick={() => exec("strikeThrough")} title="Barré"><Strikethrough size={18} /></Btn>
            <label
              className="w-9 h-9 grid place-items-center rounded-md hover:bg-white/10 cursor-pointer text-white/85 hover:text-white relative"
              title="Couleur du texte"
              aria-label="Couleur du texte"
            >
              <Type size={18} />
              <span
                className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-sm"
                style={{ background: "linear-gradient(90deg,#F5C800,#1A1AC8)" }}
              />
              <input
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => exec("foreColor", e.target.value)}
              />
            </label>
          </Group>

          {/* Paragraphe */}
          <Group label="Paragraphe">
            <Btn onClick={() => exec("justifyLeft")} title="Aligner à gauche"><AlignLeft size={18} /></Btn>
            <Btn onClick={() => exec("justifyCenter")} title="Centrer"><AlignCenter size={18} /></Btn>
            <Btn onClick={() => exec("justifyRight")} title="Aligner à droite"><AlignRight size={18} /></Btn>
            <Btn onClick={() => exec("justifyFull")} title="Justifier"><AlignJustify size={18} /></Btn>
            <span className="w-px h-6 bg-white/10 mx-0.5" />
            <Btn onClick={() => exec("insertUnorderedList")} title="Liste à puces"><List size={18} /></Btn>
            <Btn onClick={() => exec("insertOrderedList")} title="Liste numérotée"><ListOrdered size={18} /></Btn>
            <Btn onClick={handleQuote} title="Citation"><Quote size={18} /></Btn>
            <Btn onClick={handleHr} title="Séparateur"><Minus size={18} /></Btn>
          </Group>

          {/* Insertion */}
          <Group label="Insertion">
            <Btn onClick={handleLink} title="Lien"><LinkIcon size={18} /></Btn>
            <Btn onClick={handleImage} title="Image"><ImageIcon size={18} /></Btn>
            <Btn onClick={handleVideo} title="Vidéo"><Video size={18} /></Btn>
            <Btn onClick={handleCode} title="Bloc de code"><Code size={18} /></Btn>
            <Btn onClick={handleReadMore} title="Lire la suite"><BookOpen size={18} /></Btn>
          </Group>
        </div>
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
