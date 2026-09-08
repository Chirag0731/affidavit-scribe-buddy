import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeightRule,
  VerticalAlign,
  LevelFormat,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import notaryBlockAsset from "@/assets/notary-block.png.asset.json";
import type { AffidavitDoc } from "@/types/neptora";
import { buildIntroSentence, buildNotarySentence } from "@/types/neptora";

async function loadNotaryImageBytes(): Promise<Uint8Array | null> {
  try {
    if (notaryBlockAsset?.url) {
      const res = await fetch(notaryBlockAsset.url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const arr = new Uint8Array(buf);
        if (arr.length > 8 && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) {
          return arr;
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch notary block asset from URL:", err);
  }
  return null;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const body = dataUrl.split(",")[1] ?? "";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// =====================================================================
// PDF
// =====================================================================

export async function generatePdf(doc: AffidavitDoc): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 54;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BODY = 10.5;
  const LH = 14;

  const notaryBlockBytes = await loadNotaryImageBytes();
  let notaryBlockImg: any = null;
  if (notaryBlockBytes) {
    try {
      notaryBlockImg = await pdf.embedPng(notaryBlockBytes);
    } catch (e) {
      console.warn("Could not embed notary png into PDF:", e);
    }
  }

  const page = pdf.addPage([PAGE_W, PAGE_H]);

  interface Seg { text: string; bold?: boolean; }

  const sanitizePdfText = (str: string): string => {
    if (!str) return "";
    // Replace tabs with spaces
    let s = str.replace(/\t/g, "    ");
    // Normalize newlines and carriage returns
    s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Replace non-breaking spaces with normal spaces
    s = s.replace(/\u00A0/g, " ");
    // Strip control characters except newline (0x00-0x09, 0x0B, 0x0C, 0x0E-0x1F, 0x7F)
    // eslint-disable-next-line no-control-regex
    s = s.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");
    return s;
  };

  const safeWidthOfText = (f: typeof font | typeof bold, text: string, size: number): number => {
    if (!text) return 0;
    try {
      return f.widthOfTextAtSize(text, size);
    } catch {
      // Fallback: strip any remaining unencodable chars
      const safe = text.replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, "");
      try {
        return f.widthOfTextAtSize(safe, size);
      } catch {
        return text.length * size * 0.5;
      }
    }
  };

  const wrapSegments = (segs: Seg[], maxW: number, size: number): Seg[][] => {
    const lines: Seg[][] = [];
    let cur: Seg[] = [];
    let curW = 0;
    const w = (t: string, b?: boolean) => safeWidthOfText(b ? bold : font, t, size);

    for (const seg of segs) {
      const sanitized = sanitizePdfText(seg.text);
      const rawLines = sanitized.split("\n");

      rawLines.forEach((rawLine, lineIdx) => {
        if (lineIdx > 0) {
          lines.push(cur);
          cur = [];
          curW = 0;
        }

        if (!rawLine) return;

        const words = rawLine.split(/( +)/);
        for (const word of words) {
          if (!word) continue;
          const ww = w(word, seg.bold);
          if (curW + ww > maxW && cur.length > 0) {
            lines.push(cur);
            cur = [];
            curW = 0;
            if (/^ +$/.test(word)) continue;
          }
          cur.push({ text: word, bold: seg.bold });
          curW += ww;
        }
      });
    }
    if (cur.length) lines.push(cur);
    return lines;
  };

  const baselineFromTop = (top: number, size: number) => PAGE_H - top - size;
  const drawTextTop = (
    text: string,
    x: number,
    top: number,
    size: number,
    f = font,
  ) => {
    const sanitized = sanitizePdfText(text).replace(/\n/g, " ").trim();
    if (!sanitized) return;
    try {
      page.drawText(sanitized, {
        x,
        y: baselineFromTop(top, size),
        size,
        font: f,
        color: rgb(0, 0, 0),
      });
    } catch {
      const safe = sanitized.replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, "");
      if (safe) {
        try {
          page.drawText(safe, {
            x,
            y: baselineFromTop(top, size),
            size,
            font: f,
            color: rgb(0, 0, 0),
          });
        } catch {
          // ignore if unencodable
        }
      }
    }
  };

  const drawSegmentsTop = (
    segs: Seg[],
    top: number,
    opts: { x?: number; maxW?: number; size?: number; lh?: number; center?: boolean } = {},
  ): number => {
    const size = opts.size ?? BODY;
    const maxW = opts.maxW ?? CONTENT_W;
    const lh = opts.lh ?? LH;
    const lines = wrapSegments(segs, maxW, size);
    let lineTop = top;
    for (const line of lines) {
      while (line.length && /^ +$/.test(line[0].text)) line.shift();
      const lineW = line.reduce((acc, s) => {
        const f = s.bold ? bold : font;
        return acc + safeWidthOfText(f, s.text, size);
      }, 0);
      let x = opts.center ? (PAGE_W - lineW) / 2 : opts.x ?? MARGIN;
      for (const s of line) {
        const f = s.bold ? bold : font;
        drawTextTop(s.text, x, lineTop, size, f);
        x += safeWidthOfText(f, s.text, size);
      }
      lineTop += lh;
    }
    return lineTop;
  };

  const L = doc.layout;

  {
    const size = L.title.size ?? 14;
    const tw = safeWidthOfText(bold, doc.title, size);
    const boxX = L.title.x ?? MARGIN;
    const boxW = L.title.width ?? CONTENT_W;
    drawTextTop(doc.title, boxX + (boxW - tw) / 2, L.title.top, size, bold);
  }

  drawTextTop(doc.prettyDate, L.date.x ?? MARGIN, L.date.top, L.date.size ?? BODY);

  const intro = buildIntroSentence(doc);
  const idx = intro.indexOf("MAKE OATH AND SAY AS FOLLOWS:");
  const introSegs: Seg[] =
    idx >= 0
      ? [
          { text: intro.slice(0, idx) },
          { text: "MAKE OATH AND SAY AS FOLLOWS:", bold: true },
        ]
      : [{ text: intro }];
  const introX = L.intro.x ?? MARGIN;
  const afterIntroTop = drawSegmentsTop(introSegs, L.intro.top, {
    x: introX,
    maxW: L.intro.width ?? PAGE_W - introX - MARGIN,
    size: L.intro.size ?? BODY,
    lh: L.intro.lh ?? LH,
  });

  const NUM_W = 22;
  const factNumX = L.facts.x ?? MARGIN;
  const FACT_INDENT = factNumX + NUM_W;
  const FACT_W = (L.facts.width ?? PAGE_W - factNumX - MARGIN) - NUM_W;
  const factSize = L.facts.size ?? BODY;
  const factLh = L.facts.lh ?? LH;
  let factTop = Math.max(L.facts.top, afterIntroTop + 8);
  doc.facts.forEach((fact, i) => {
    drawTextTop(`${i + 1}.`, factNumX, factTop, factSize);
    factTop = drawSegmentsTop([{ text: fact }], factTop, {
      x: FACT_INDENT,
      maxW: FACT_W,
      size: factSize,
      lh: factLh,
    }) + 4;
  });

  const sigStartX = L.signatureLine.x ?? MARGIN;
  const sigCount = Math.max(1, doc.deponents.length);
  const sigAvailable = PAGE_W - MARGIN - sigStartX;
  const perLineW = Math.min(L.signatureLine.width ?? 160, sigAvailable / sigCount - 10);
  // Spread signature lines evenly across the available width (max separation)
  const sigStep = sigCount > 1 ? (sigAvailable - perLineW) / (sigCount - 1) : 0;
  const signatureLineTop = Math.max(L.signatureLine.top, factTop + 12);
  const signatureLineY = PAGE_H - signatureLineTop;
  doc.deponents.forEach((d, i) => {
    const x0 = sigStartX + i * sigStep;
    page.drawLine({
      start: { x: x0, y: signatureLineY },
      end: { x: x0 + perLineW, y: signatureLineY },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
    drawTextTop(d.name, x0, signatureLineTop + 3.5, BODY);
  });

  // Signature images drawn on top of the lines
  for (const sig of doc.signatures ?? []) {
    if (!sig.dataUrl) continue;
    try {
      const img = await pdf.embedPng(dataUrlToBytes(sig.dataUrl));
      page.drawImage(img, {
        x: sig.x,
        y: PAGE_H - sig.top - sig.height,
        width: sig.width,
        height: sig.height,
      });
    } catch {
      /* skip unreadable signature */
    }
  }




  if (notaryBlockImg) {
    const blockW = L.notaryImage.width ?? 248;
    const blockH = L.notaryImage.height ?? (blockW * notaryBlockImg.height) / notaryBlockImg.width;
    page.drawImage(notaryBlockImg, {
      x: L.notaryImage.x ?? 308,
      y: PAGE_H - L.notaryImage.top - blockH,
      width: blockW,
      height: blockH,
    });
  } else {
    const boxX = L.notaryImage.x ?? 308;
    const boxW = L.notaryImage.width ?? 248;
    const boxTop = L.notaryImage.top ?? 550;
    const boxH = 100;
    page.drawRectangle({
      x: boxX,
      y: PAGE_H - boxTop - boxH,
      width: boxW,
      height: boxH,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
      color: rgb(0.99, 0.99, 0.99),
    });

    const stampLines = [
      { text: "MARYANA IVANIVN DUBANOVYCH", bold: true, size: 8.5 },
      { text: "A Notary Public / Commissioner for Oaths", bold: false, size: 7.5 },
      { text: "in and for the Province of Ontario", bold: false, size: 7.5 },
      { text: "Commission Expiry: September 8, 2026", bold: false, size: 7.5 },
      { text: "LSO Licence No. P14522", bold: true, size: 7.5 },
      { text: "Reliance Notary Public • Etobicoke, ON", bold: false, size: 7 },
    ];

    let st = boxTop + 12;
    for (const sl of stampLines) {
      const f = sl.bold ? bold : font;
      const lw = safeWidthOfText(f, sl.text, sl.size);
      drawTextTop(sl.text, boxX + (boxW - lw) / 2, st, sl.size, f);
      st += 14;
    }
  }

  const ackTitle = "NOTARY ACKNOWLEDGEMENT";
  const ackTitleSize = L.ackTitle.size ?? 11;
  const ackTitleW = safeWidthOfText(bold, ackTitle, ackTitleSize);
  const ackBoxX = L.ackTitle.x ?? MARGIN;
  const ackBoxW = L.ackTitle.width ?? CONTENT_W;
  drawTextTop(ackTitle, ackBoxX + (ackBoxW - ackTitleW) / 2, L.ackTitle.top, ackTitleSize, bold);

  {
    const x = L.ackText.x ?? MARGIN + 20;
    const w = L.ackText.width ?? CONTENT_W - 40;
    const lines = wrapSegments([{ text: buildNotarySentence(doc) }], w, L.ackText.size ?? 10);
    let top = L.ackText.top;
    for (const line of lines) {
      while (line.length && /^ +$/.test(line[0].text)) line.shift();
      const size = L.ackText.size ?? 10;
      const lineW = line.reduce((acc, s) => acc + safeWidthOfText(s.bold ? bold : font, s.text, size), 0);
      let cx = x + (w - lineW) / 2;
      for (const s of line) {
        const f = s.bold ? bold : font;
        drawTextTop(s.text, cx, top, size, f);
        cx += safeWidthOfText(f, s.text, size);
      }
      top += L.ackText.lh ?? 13;
    }
  }

  const swornText =
    `Sworn/Declared Remotely from the City of ${doc.city} in the Province of Ontario ` +
    `before me in the city of Toronto in the Province of Ontario & Country of Canada ` +
    `This ${doc.dayOfMonth} in accordance with O. Reg 431/20 Administering Oath or ` +
    `Declaration Remotely Ontario.`;
  drawSegmentsTop([{ text: swornText }], L.sworn.top, {
    x: L.sworn.x ?? MARGIN,
    maxW: L.sworn.width ?? 234,
    size: L.sworn.size ?? 8.5,
    lh: L.sworn.lh ?? 12,
  });


  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

// =====================================================================
// DOCX
// =====================================================================

export async function generateDocx(doc: AffidavitDoc): Promise<Blob> {
  const notaryBlockBytes = await loadNotaryImageBytes();


  const intro = buildIntroSentence(doc);
  const idx = intro.indexOf("MAKE OATH AND SAY AS FOLLOWS:");
  const introRuns: TextRun[] =
    idx >= 0
      ? [
          new TextRun({ text: intro.slice(0, idx), font: "Calibri", size: 22 }),
          new TextRun({
            text: "MAKE OATH AND SAY AS FOLLOWS:",
            font: "Calibri",
            size: 22,
            bold: true,
          }),
        ]
      : [new TextRun({ text: intro, font: "Calibri", size: 22 })];

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({ text: doc.title, bold: true, size: 28, font: "Calibri" }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: doc.prettyDate, font: "Calibri", size: 22 })],
    }),
  );

  children.push(new Paragraph({ spacing: { after: 200 }, children: introRuns }));

  const factIndentTwips = Math.max(0, Math.round(((doc.layout.facts.x ?? 54) - 54) * 20)) + 720;
  doc.facts.forEach((fact, i) => {
    const factLines = fact.split(/\r?\n/);
    const runs: TextRun[] = [
      new TextRun({ text: `${i + 1}. `, font: "Calibri", size: 22 }),
      new TextRun({ text: factLines[0] || "", font: "Calibri", size: 22 }),
    ];
    for (let j = 1; j < factLines.length; j++) {
      runs.push(
        new TextRun({
          text: factLines[j],
          font: "Calibri",
          size: 22,
          break: 1,
        }),
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 160, line: 300 },
        indent: { left: factIndentTwips, hanging: 360 },
        children: runs,
      }),
    );
  });

  const TOTAL_W = 9360;
  const n = Math.max(1, doc.deponents.length);
  const sigLineWPt = doc.layout.signatureLine.width ?? 160;
  const colW = Math.min(Math.round(sigLineWPt * 20), Math.floor(TOTAL_W / n) - 200);
  const spacerW = n > 1 ? Math.floor((TOTAL_W - colW * n) / (n - 1)) : 0;
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
  const blank = (w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: noBorder,
      children: [new Paragraph({ children: [new TextRun({ text: " ", font: "Calibri", size: 22 })] })],
    });

  const columnWidths: number[] = [];
  const sigCells: TableCell[] = [];
  const nameCells: TableCell[] = [];
  doc.deponents.forEach((d, i) => {
    if (i > 0 && spacerW > 0) {
      columnWidths.push(spacerW);
      sigCells.push(blank(spacerW));
      nameCells.push(blank(spacerW));
    }
    columnWidths.push(colW);
    const sig = (doc.signatures ?? []).find((s) => s.deponentIndex === i && s.dataUrl);
    sigCells.push(
      new TableCell({
        width: { size: colW, type: WidthType.DXA },
        borders: { ...noBorder, bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } },
        children: [
          sig
            ? new Paragraph({
                spacing: { before: 200 },
                children: [
                  new ImageRun({
                    type: "png",
                    data: dataUrlToBytes(sig.dataUrl),
                    transformation: {
                      width: Math.round(sig.width * (96 / 72)),
                      height: Math.round(sig.height * (96 / 72)),
                    },
                    altText: {
                      title: "Signature",
                      description: `Signature of ${d.name}`,
                      name: "signature",
                    },
                  }),
                ],
              })
            : new Paragraph({
                spacing: { before: 600 },
                children: [new TextRun({ text: " ", font: "Calibri", size: 22 })],
              }),
        ],
      }),

    );
    nameCells.push(
      new TableCell({
        width: { size: colW, type: WidthType.DXA },
        borders: noBorder,
        children: [new Paragraph({ children: [new TextRun({ text: d.name, font: "Calibri", size: 22 })] })],
      }),
    );
  });
  children.push(
    new Table({
      width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnWidths,
      rows: [new TableRow({ children: sigCells }), new TableRow({ children: nameCells })],
    }),
  );


  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 120 },
      children: [
        new TextRun({ text: "NOTARY ACKNOWLEDGEMENT", bold: true, size: 22, font: "Calibri" }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [new TextRun({ text: buildNotarySentence(doc), font: "Calibri", size: 20 })],
    }),
  );

  const swornText =
    `Sworn/Declared Remotely from the City of ${doc.city} in the Province of Ontario ` +
    `before me in the city of Toronto in the Province of Ontario & Country of Canada ` +
    `This ${doc.dayOfMonth} in accordance with O. Reg 431/20 Administering Oath or ` +
    `Declaration Remotely Ontario.`;

  const leftCell = new TableCell({
    width: { size: 4800, type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.BOTTOM,
    children: [
      new Paragraph({
        children: [new TextRun({ text: swornText, font: "Calibri", size: 18 })],
      }),
    ],
  });

  const blockW = 240;
  const blockH = Math.round((blockW * 202) / 361);

  let rightCellChildren: Paragraph[] = [];
  if (notaryBlockBytes) {
    try {
      const blockW = 240;
      const blockH = Math.round((blockW * 202) / 361);
      rightCellChildren = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "png",
              data: notaryBlockBytes,
              transformation: { width: blockW, height: blockH },
              altText: { title: "Notary block", description: "Notary signature and seal", name: "notary_block" },
            }),
          ],
        }),
      ];
    } catch (err) {
      console.warn("Could not create ImageRun for docx:", err);
    }
  }

  if (rightCellChildren.length === 0) {
    rightCellChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: "MARYANA IVANIVN DUBANOVYCH", bold: true, size: 18, font: "Calibri" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({ text: "A Notary Public / Commissioner for Oaths in Ontario", size: 16, font: "Calibri" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({ text: "Commission Expiry: September 8, 2026 • LSO Licence No. P14522", size: 16, font: "Calibri" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({ text: "Reliance Notary Public — Toronto, ON", italics: true, size: 15, font: "Calibri" }),
        ],
      }),
    ];
  }

  const rightCell = new TableCell({
    width: { size: 4560, type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.BOTTOM,
    children: rightCellChildren,
  });

  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4800, 4560],
      rows: [
        new TableRow({
          children: [leftCell, rightCell],
          height: { value: 3200, rule: HeightRule.ATLEAST },
        }),
      ],
    }),
  );

  const wordDoc = new Document({
    creator: "Neptora",
    title: doc.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    numbering: {
      config: [
        {
          reference: "facts",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(wordDoc);
}
