import { type AffidavitDoc } from "@/types/neptora";

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

  const toPx = (pt: number) => pt * PT_TO_PX;

  return (
    <div className={`bg-white overflow-auto p-4 ${className}`}>
      <div
        className="relative bg-white shadow-sm mx-auto"
        style={{
          width: pageWidth,
          height: pageHeight,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: toPx(12),
          lineHeight: 1.4,
          color: "#000",
          boxShadow: "0 0 0 1px #e5e5e5",
        }}
      >
        {/* Title */}
        {layout.title && (
          <div
            className="absolute text-center font-bold uppercase"
            style={{
              left: toPx(layout.title.x),
              top: toPx(layout.title.y),
              width: toPx(layout.title.width),
              fontSize: toPx(layout.title.fontSize || 14),
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
              left: toPx(layout.date.x),
              top: toPx(layout.date.y),
              width: toPx(layout.date.width),
              fontSize: toPx(layout.date.fontSize || 12),
            }}
          >
            {doc.date}
          </div>
        )}

        {/* Intro */}
        {layout.intro && (
          <div
            className="absolute text-justify"
            style={{
              left: toPx(layout.intro.x),
              top: toPx(layout.intro.y),
              width: toPx(layout.intro.width),
              fontSize: toPx(layout.intro.fontSize || 12),
            }}
          >
            {doc.intro}
          </div>
        )}

        {/* Facts */}
        {layout.facts && doc.facts.map((fact, i) => (
          <div
            key={i}
            className="absolute text-justify"
            style={{
              left: toPx((layout.facts?.x ?? 54) + (layout.facts?.numberIndent ?? 0)),
              top: toPx((layout.facts?.y ?? 200) + i * toPx(layout.facts?.lineHeight ?? 14)),
              width: toPx((layout.facts?.width ?? 500) - (layout.facts?.numberIndent ?? 0)),
              fontSize: toPx(layout.facts?.fontSize || 12),
            }}
          >
            <span className="font-bold">{i + 1}. </span>
            {fact}
          </div>
        ))}

        {/* Signature lines */}
        {layout.signatureLine && doc.deponents.map((deponent, i) => {
          const sig = layout.signatureLine;
          const gap = doc.deponents.length > 1
            ? (sig.width - 160 * doc.deponents.length) / Math.max(1, doc.deponents.length - 1)
            : 0;
          const x = sig.x + i * (160 + gap);
          return (
            <div key={i}>
              <div
                className="absolute border-b border-black"
                style={{
                  left: toPx(x),
                  top: toPx(sig.y),
                  width: toPx(sig.width / (doc.deponents.length > 1 ? doc.deponents.length : 1)),
                }}
              />
              <div
                className="absolute text-center"
                style={{
                  left: toPx(x),
                  top: toPx(sig.y + 4),
                  width: toPx(sig.width / (doc.deponents.length > 1 ? doc.deponents.length : 1)),
                  fontSize: toPx(10),
                }}
              >
                {deponent}
              </div>
            </div>
          );
        })}

        {/* Acknowledgement */}
        {layout.acknowledgement && (
          <div
            className="absolute text-center italic"
            style={{
              left: toPx(layout.acknowledgement.x),
              top: toPx(layout.acknowledgement.y),
              width: toPx(layout.acknowledgement.width),
              fontSize: toPx(layout.acknowledgement.fontSize || 12),
            }}
          >
            {doc.acknowledgement}
          </div>
        )}

        {/* Notary block image */}
        {layout.notaryBlock && (
          <div
            className="absolute"
            style={{
              left: toPx(layout.notaryBlock.x),
              top: toPx(layout.notaryBlock.y),
              width: toPx(layout.notaryBlock.width),
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
