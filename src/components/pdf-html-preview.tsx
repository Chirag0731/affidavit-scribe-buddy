import {
  type AffidavitDoc,
  type TemplateLayout,
  type ElementPos,
  buildIntroSentence,
  buildNotarySentence,
} from "@/types/neptora";

interface PdfHtmlPreviewProps {
  doc: AffidavitDoc;
  className?: string;
}

// A4 page dimensions in CSS pixels (96 DPI)
const PAGE_WIDTH_PX = 794; // 8.27in
const PAGE_HEIGHT_PX = 1123; // 11.69in
const PT_TO_PX = 96 / 72; // 1pt = 1.333px

export function PdfHtmlPreview({ doc, className = "" }: PdfHtmlPreviewProps) {
  const layout = doc.layout;
  const pageWidth = PAGE_WIDTH_PX;
  const pageHeight = PAGE_HEIGHT_PX;

  const toPx = (pt?: number) => (pt ?? 0) * PT_TO_PX;
  const pos = (p: ElementPos) => ({
    left: toPx(p.x ?? 54),
    top: toPx(p.top),
    width: toPx(p.width ?? (PAGE_WIDTH_PX / PT_TO_PX - (p.x ?? 54) * 2)),
  });

  const intro = buildIntroSentence(doc);
  const notarySentence = buildNotarySentence(doc);
  const swornText = `Sworn/Declared Remotely from the City of ${doc.city} in the Province of Ontario before me in the city of Toronto in the Province of Ontario & Country of Canada This ${doc.dayOfMonth} in accordance with O. Reg 431/20 Administering Oath or Declaration Remotely Ontario.`;

  return (
    <div className={`bg-white overflow-auto p-4 ${className}`}>
      <div
        className="relative bg-white shadow-sm mx-auto"
        style={{
          width: pageWidth,
          height: pageHeight,
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

        {/* Facts */}
        {layout.facts &&
          doc.facts.map((fact, i) => {
            const baseTop = layout.facts.top;
            const lineHeight = layout.facts.lh ?? 14;
            const numberIndent = 18;
            const factX = (layout.facts.x ?? 54) + numberIndent;
            const factWidth = (layout.facts.width ?? 504) - numberIndent;
            return (
              <div
                key={i}
                className="absolute text-justify"
                style={{
                  left: toPx(factX),
                  top: toPx(baseTop + i * lineHeight),
                  width: toPx(factWidth),
                  fontSize: toPx(layout.facts.size ?? 10.5),
                  lineHeight: lineHeight / (layout.facts.size ?? 10.5),
                }}
              >
                <span className="font-bold">{i + 1}. </span>
                {fact}
              </div>
            );
          })}

        {/* Signature lines */}
        {layout.signatureLine &&
          doc.deponents.map((deponent, i) => {
            const sig = layout.signatureLine;
            const lineW = sig.width ?? 160;
            const count = doc.deponents.length;
            const usable = (sig.width ?? 160) * count + (count - 1) * 40;
            const gap = count > 1 ? (usable - lineW * count) / Math.max(1, count - 1) : 0;
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
