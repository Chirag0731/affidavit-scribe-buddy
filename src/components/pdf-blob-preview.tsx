import { useEffect, useRef, useState } from "react";

/**
 * Renders a PDF blob to a canvas with pdf.js so the live preview works
 * everywhere (sandboxed iframes block the native PDF plugin).
 * Falls back to an <iframe> if pdf.js cannot start.
 */
export function PdfBlobPreview({
  blob,
  aspect,
  className = "",
}: {
  blob: Blob | null;
  aspect: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    const url = URL.createObjectURL(blob);
    setFallbackUrl(url);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();

        const data = new Uint8Array(await blob.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        const page = await doc.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const cssWidth = wrap.clientWidth || 600;
        const base = page.getViewport({ scale: 1 });
        const scale = (cssWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        const context = canvas.getContext("2d");
        if (!context) return;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!cancelled) setFailed(false);
      } catch (e) {
        console.error("pdf.js preview failed", e);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return (
    <div ref={wrapRef} className={`bg-white ${className}`} style={{ aspectRatio: aspect }}>
      {failed && fallbackUrl ? (
        <iframe title="Document preview" src={`${fallbackUrl}#toolbar=0`} className="w-full h-full" />
      ) : (
        <canvas ref={canvasRef} className="w-full block" />
      )}
    </div>
  );
}
