import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Sous-dossier dans le bucket (ex: "articles", "videos/thumbnails") */
  folder?: string;
  /** Hauteur max d'aperçu en px */
  maxPreviewHeight?: number;
};

// 10 ans en secondes — quasi permanent pour l'affichage public
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

export default function ImageUpload({ value, onChange, folder = "uploads", maxPreviewHeight = 420 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image trop volumineuse (max 10 Mo).");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr) throw signErr;
      onChange(data.signedUrl);
    } catch (e: any) {
      setError(e.message || "Échec de l'upload.");
    } finally {
      setUploading(false);
    }
  }, [folder, onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed transition overflow-hidden
          ${dragOver ? "border-pogi-yellow bg-pogi-yellow/5" : "border-white/15 hover:border-white/30"}
          ${value ? "" : "p-10 text-center"}`}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full object-cover" style={{ maxHeight: maxPreviewHeight }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-black/70 hover:bg-black text-white"
              title="Retirer l'image"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-2 right-2 px-3 py-1.5 rounded-md bg-black/70 text-white text-xs flex items-center gap-2">
              <Upload size={14} /> Remplacer
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/60">
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            <div className="text-sm">
              {uploading ? "Envoi en cours…" : <>Cliquez pour choisir une image, ou glissez-déposez ici</>}
            </div>
            <div className="text-xs text-white/40">PNG, JPG, WEBP, GIF — max 10 Mo</div>
          </div>
        )}
        {uploading && value && (
          <div className="absolute inset-0 bg-black/60 grid place-items-center text-white">
            <Loader2 className="animate-spin" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
