import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
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
  const [imgBroken, setImgBroken] = useState(false);
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
      const converted = await toWebp(file);
      const ext = converted.type === "image/webp" ? "webp" : (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, converted, {
        cacheControl: "31536000",
        upsert: false,
        contentType: converted.type,
      });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr) throw signErr;
      setImgBroken(false);
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

  const pick = () => !uploading && inputRef.current?.click();

  return (
    <div className="space-y-3">
      {/* Aperçu de l'image actuelle */}
      {value && (
        <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20">
          {!imgBroken ? (
            <img
              src={value}
              alt="Aperçu"
              onError={() => setImgBroken(true)}
              className="w-full object-cover"
              style={{ maxHeight: maxPreviewHeight }}
            />
          ) : (
            <div className="flex items-center gap-3 p-4 text-white/60 text-sm">
              <ImageIcon size={18} />
              <span className="truncate">Impossible de charger l'aperçu — l'URL enregistrée est peut-être invalide.</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setImgBroken(false); onChange(null); }}
            className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-black/70 hover:bg-black text-white"
            title="Retirer l'image"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Zone d'import / remplacement */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={pick}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition
          ${dragOver ? "border-pogi-yellow bg-pogi-yellow/5" : "border-white/20 hover:border-white/40 bg-white/[0.02]"}`}
      >
        <div className="flex flex-col items-center gap-3 text-white/70">
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          <div className="text-sm">
            {uploading
              ? "Envoi en cours…"
              : value
                ? "Glissez une nouvelle image ici pour remplacer"
                : "Glissez-déposez une image ici"}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); pick(); }}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-pogi-yellow text-pogi-dark font-bold uppercase text-sm px-4 py-2 rounded-md disabled:opacity-50"
          >
            <Upload size={14} />
            {value ? "Remplacer l'image" : "Choisir un fichier"}
          </button>
          <div className="text-xs text-white/40">PNG, JPG, WEBP, GIF — max 10 Mo</div>
        </div>
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
