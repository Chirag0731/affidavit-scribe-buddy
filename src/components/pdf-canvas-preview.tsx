import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import * as pdfjs from "pdfjs-dist";

const WORKER_URL = "/pdf.worker.min.mjs";

function ensureWorkerSrc() {
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
  }
}

interface PdfCanvasPreviewProps {
  url: string;
  className?: string;
}

export function PdfCanvasPreview({ url, className = "" }: PdfCanvasPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        await ensureWorkerSrc();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
        const buf = await res.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;

        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const scale = 1.5;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "bg-white shadow-sm mx-auto";
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          container.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("PdfCanvasPreview error:", err);
          setError(err instanceof Error ? err.message : "Failed to render PDF preview");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 bg-white ${className}`}>
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mr-2" />
        <span className="text-muted-foreground text-sm">Rendering preview…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 bg-white ${className}`}>
        <AlertCircle className="w-6 h-6 text-destructive mb-2" />
        <p className="text-destructive text-sm text-center max-w-md">{error}</p>
        <p className="text-muted-foreground text-xs mt-2">
          You can still download the PDF using the button below.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`space-y-4 bg-white p-4 overflow-auto ${className}`}
      style={{ minHeight: "400px" }}
    />
  );
}
