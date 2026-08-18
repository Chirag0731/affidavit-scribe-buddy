import { useRef } from "react";
import {
  type AffidavitDoc,
  type ElementPos,
  type SignaturePlacement,
  buildIntroSentence,
  buildNotarySentence,
  signatureLinePositions,
} from "@/types/neptora";

interface PdfHtmlPreviewProps {
  doc: AffidavitDoc;
  className?: string;
  /** When provided, placed signatures can be dragged and resized. */
  onSignaturesChange?: (next: SignaturePlacement[]) => void;
}

// A4 page dimensions in CSS pixels (96 DPI)
const PAGE_WIDTH_PX = 794; // 8.27in
const PAGE_HEIGHT_PX = 1123; // 11.69in
const PT_TO_PX = 96 / 72; // 1pt = 1.333px

export function PdfHtmlPreview({ doc, className = "", onSignaturesChange }: PdfHtmlPreviewProps) {
  const layout = doc.layout;
  const dragRef = useRef<{
    index: number;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    orig: SignaturePlacement;
  } | null>(null);

  const toPx = (pt?: number) => (pt ?? 0) * PT_TO_PX;
  const pos = (p: ElementPos) => ({
    left: toPx(p.x ?? 54),
    top: toPx(p.top),
    width: toPx(p.width ?? (PAGE_WIDTH_PX / PT_TO_PX - (p.x ?? 54) * 2)),
  });

  const signatures = doc.signatures ?? [];
  const lines = signatureLinePositions(layout, doc.deponents.length);

  const onPointerDown = (
    e: React.PointerEvent,
    index: number,
    mode: "move" | "resize",
  ) => {
    if (!onSignaturesChange) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      index,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...signatures[index] },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !onSignaturesChange) return;
    const dx = (e.clientX - d.startX) / PT_TO_PX;
    const dy = (e.clientY - d.startY) / PT_TO_PX;
    const next = signatures.map((s, i) => {
      if (i !== d.index) return s;
      if (d.mode === "move") {
        return { ...s, x: d.orig.x + dx, top: d.orig.top + dy };
      }
      const ratio = d.orig.height / d.orig.width;
      const width = Math.max(20, d.orig.width + dx);
      return { ...s, width, height: width * ratio };
    });
    onSignaturesChange(next);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const intro = buildIntroSentence(doc);
  const notarySentence = buildNotarySentence(doc);
  const swornText = `Sworn/Declared Remotely from the City of ${doc.city} in the Province of Ontario before me in the city of Toronto in the Province of Ontario & Country of Canada This ${doc.dayOfMonth} in accordance with O. Reg 431/20 Administering Oath or Declaration Remotely Ontario.`;


  return (
    <div className={`bg-white overflow-auto p-4 ${className}`}>
      <div
        className="relative bg-white shadow-sm mx-auto"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          width: PAGE_WIDTH_PX,
          height: PAGE_HEIGHT_PX,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: toPx(12),
          lineHeight: 1.35,
          color: "#000",
          boxShadow: "0 0 0 1px #e5e5e5",
        }}
      >
        {/* Title */}
        {layout.title && (
          <div
            className="absolute text-center font-bold uppercase whitespace-pre-wrap"
            style={{
              ...pos(layout.title),
              fontSize: toPx(layout.title.size ?? 14),
            }}
          >
            {doc.title}
          </div>
        )}

        {/* Date */}
        {layout.date && (
          <div
            className="absolute"
            style={{
              ...pos(layout.date),
              fontSize: toPx(layout.date.size ?? 10.5),
            }}
          >
            {doc.prettyDate}
          </div>
        )}

        {/* Intro */}
        {layout.intro && (
          <div
            className="absolute text-justify"
            style={{
              ...pos(layout.intro),
              fontSize: toPx(layout.intro.size ?? 10.5),
              lineHeight: (layout.intro.lh ?? 14) / (layout.intro.size ?? 10.5),
            }}
          >
            {intro}
          </div>
        )}

        {/* Facts - flowing container so multi-line facts wrap naturally */}
        {layout.facts && (
          <div
            className="absolute text-justify"
            style={{
              left: toPx(layout.facts.x ?? 54),
              top: toPx(layout.facts.top),
              width: toPx(layout.facts.width ?? 504),
              fontSize: toPx(layout.facts.size ?? 10.5),
              lineHeight: (layout.facts.lh ?? 14) / (layout.facts.size ?? 10.5),
            }}
          >
            {doc.facts.map((fact, i) => (
              <div
                key={i}
                className="pl-[1.2em] -indent-[1.2em]"
                style={{
                  marginBottom: i < doc.facts.length - 1 ? toPx(6) : 0,
                }}
              >
                <span className="font-bold">{i + 1}. </span>
                {fact}
              </div>
            ))}
          </div>
        )}

        {/* Signature lines */}
        {layout.signatureLine &&
          doc.deponents.map((deponent, i) => {
            const sig = layout.signatureLine;
            const lineW = sig.width ?? 160;
            const count = doc.deponents.length;
            const gap = count > 1 ? 40 : 0;
            const x = (sig.x ?? 54) + i * (lineW + gap);
            return (
              <div key={i}>
                <div
                  className="absolute border-b border-black"
                  style={{
                    left: toPx(x),
                    top: toPx(sig.top),
                    width: toPx(lineW),
                  }}
                />
                <div
                  className="absolute text-center"
                  style={{
                    left: toPx(x),
                    top: toPx(sig.top + 4),
                    width: toPx(lineW),
                    fontSize: toPx(10),
                  }}
                >
                  {deponent.name}
                </div>
              </div>
            );
          })}

        {/* Acknowledgement title */}
        {layout.ackTitle && (
          <div
            className="absolute text-center font-bold uppercase"
            style={{
              ...pos(layout.ackTitle),
              fontSize: toPx(layout.ackTitle.size ?? 11),
            }}
          >
            NOTARY ACKNOWLEDGEMENT
          </div>
        )}

        {/* Acknowledgement text */}
        {layout.ackText && (
          <div
            className="absolute text-justify"
            style={{
              ...pos(layout.ackText),
              fontSize: toPx(layout.ackText.size ?? 10),
              lineHeight: (layout.ackText.lh ?? 13) / (layout.ackText.size ?? 10),
            }}
          >
            {notarySentence}
          </div>
        )}

        {/* Sworn text */}
        {layout.sworn && (
          <div
            className="absolute text-justify"
            style={{
              ...pos(layout.sworn),
              fontSize: toPx(layout.sworn.size ?? 8.5),
              lineHeight: (layout.sworn.lh ?? 12) / (layout.sworn.size ?? 8.5),
            }}
          >
            {swornText}
          </div>
        )}

        {/* Notary block image */}
        {layout.notaryImage && (
          <div
            className="absolute"
            style={{
              left: toPx(layout.notaryImage.x ?? 308),
              top: toPx(layout.notaryImage.top),
              width: toPx(layout.notaryImage.width ?? 248),
            }}
          >
            <img
              src="/notary-block.png"
              alt="Notary signature block"
              className="w-full h-auto"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
