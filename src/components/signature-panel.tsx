import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, Upload, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  defaultSignaturePlacement,
  type Deponent,
  type SignaturePlacement,
  type TemplateLayout,
} from "@/types/neptora";
import {
  imageFromClipboard,
  makeSignatureTransparent,
} from "@/lib/signature-image";
import {
  deleteSignature,
  listSavedSignatures,
  loadSignatureDataUrl,
  saveSignature,
  type SavedSignature,
} from "@/lib/signatures";

interface Props {
  deponents: Deponent[];
  layout: TemplateLayout;
  signatures: SignaturePlacement[];
  onChange: (next: SignaturePlacement[]) => void;
}

export function SignaturePanel({ deponents, layout, signatures, onChange }: Props) {
  const [saved, setSaved] = useState<SavedSignature[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    listSavedSignatures()
      .then(setSaved)
      .catch(() => {
        /* library is optional */
      });
  }, []);

  const place = async (index: number, source: Blob | string) => {
    setBusy(index);
    try {
      const processed = await makeSignatureTransparent(source);
      const base = defaultSignaturePlacement(
        layout,
        index,
        deponents.length,
        processed.width / processed.height,
      );
      const next = signatures.filter((s) => s.deponentIndex !== index);
      next.push({ ...base, dataUrl: processed.dataUrl });
      next.sort((a, b) => a.deponentIndex - b.deponentIndex);
      onChange(next);
      toast.success("Signature placed on the line");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process that image");
    } finally {
      setBusy(null);
    }
  };

  const handlePaste = (index: number) => async (e: React.ClipboardEvent) => {
    const blob = imageFromClipboard(e.nativeEvent as ClipboardEvent);
    if (!blob) return;
    e.preventDefault();
    await place(index, blob);
  };

  const remove = (index: number) => {
    onChange(signatures.filter((s) => s.deponentIndex !== index));
  };

  const saveToLibrary = async (index: number) => {
    const sig = signatures.find((s) => s.deponentIndex === index);
    if (!sig) return;
    const label =
      window.prompt("Name this signature", deponents[index]?.name || "Signature")?.trim();
    if (!label) return;
    try {
      const row = await saveSignature(label, sig.dataUrl);
      setSaved((prev) => [row, ...prev]);
      toast.success("Signature saved to your library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save signature");
    }
  };

  const applySavedSignature = async (index: number, id: string) => {
    const row = saved.find((s) => s.id === id);
    if (!row) return;
    setBusy(index);
    try {
      const dataUrl = await loadSignatureDataUrl(row.storage_path);
      await place(index, dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load signature");
    } finally {
      setBusy(null);
    }
  };

  const removeSaved = async (row: SavedSignature) => {
    if (!window.confirm(`Delete saved signature "${row.label}"?`)) return;
    try {
      await deleteSignature(row);
      setSaved((prev) => prev.filter((s) => s.id !== row.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete signature");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Signatures</h3>
        <p className="text-sm text-muted-foreground">
          Click a box and paste a cropped signature (Ctrl/Cmd+V) or upload one. The background is
          removed automatically and the signature is placed on the line — drag it in the preview to
          fine-tune.
        </p>
      </div>

      {deponents.map((d, i) => {
        const sig = signatures.find((s) => s.deponentIndex === i);
        return (
          <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{d.name || `Deponent ${i + 1}`}</span>
              {sig && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveToLibrary(i)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded px-2 py-1"
                  >
                    <Save className="w-3 h-3" /> Save to library
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-destructive hover:opacity-80 flex items-center gap-1 border border-border rounded px-2 py-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              )}
            </div>

            <div
              tabIndex={0}
              onPaste={handlePaste(i)}
              className="rounded border border-dashed border-border bg-muted/30 h-24 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary cursor-text"
            >
              {busy === i ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : sig ? (
                <img
                  src={sig.dataUrl}
                  alt={`Signature of ${d.name}`}
                  className="max-h-20 object-contain"
                  style={{ filter: "invert(1)" }}
                />
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5" /> Click here, then paste your signature
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={(el) => {
                  fileRefs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) await place(i, file);
                }}
              />
              <button
                type="button"
                onClick={() => fileRefs.current[i]?.click()}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-border rounded px-3 py-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload image
              </button>
              {saved.length > 0 && (
                <select
                  className="input-base max-w-[220px] text-xs py-1.5"
                  value=""
                  onChange={(e) => e.target.value && applySavedSignature(i, e.target.value)}
                >
                  <option value="">Use saved signature…</option>
                  {saved.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}

      {saved.length > 0 && (
        <details className="border border-border rounded-lg p-4">
          <summary className="cursor-pointer text-sm text-foreground">
            Saved signatures ({saved.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <button
                  type="button"
                  onClick={() => removeSaved(s)}
                  className="text-destructive text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
