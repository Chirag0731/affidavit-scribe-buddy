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

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
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

  const notaryBlockBytes = await fetchBytes(notaryBlockAsset.url);
  const notaryBlockImg = await pdf.embedPng(notaryBlockBytes);

  const page = pdf.addPage([PAGE_W, PAGE_H]);

  interface Seg { text: string; bold?: boolean; }
  const wrapSegments = (segs: Seg[], maxW: number, size: number): Seg[][] => {
    const lines: Seg[][] = [];
    let cur: Seg[] = [];
    let curW = 0;
    const w = (t: string, b?: boolean) => (b ? bold : font).widthOfTextAtSize(t, size);
    for (const seg of segs) {
      const words = seg.text.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        const ww = w(word, seg.bold);
        if (curW + ww > maxW && cur.length > 0) {
          lines.push(cur);
          cur = [];
          curW = 0;
          if (/^\s+$/.test(word)) continue;
        }
        cur.push({ text: word, bold: seg.bold });
        curW += ww;
      }
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
    page.drawText(text, {
      x,
      y: baselineFromTop(top, size),
      size,
      font: f,
      color: rgb(0, 0, 0),
    });
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
      while (line.length && /^\s+$/.test(line[0].text)) line.shift();
      const lineW = line.reduce((acc, s) => {
        const f = s.bold ? bold : font;
        return acc + f.widthOfTextAtSize(s.text, size);
      }, 0);
      let x = opts.center ? (PAGE_W - lineW) / 2 : opts.x ?? MARGIN;
      for (const s of line) {
        const f = s.bold ? bold : font;
        drawTextTop(s.text, x, lineTop, size, f);
        x += f.widthOfTextAtSize(s.text, size);
      }
      lineTop += lh;
    }
    return lineTop;
  };

  const L = doc.layout;

  {
    const size = L.title.size ?? 14;
    const tw = bold.widthOfTextAtSize(doc.title, size);
    drawTextTop(doc.title, (PAGE_W - tw) / 2, L.title.top, size, bold);
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
  const afterIntroTop = drawSegmentsTop(introSegs, L.intro.top, {
    x: L.intro.x ?? MARGIN,
    size: L.intro.size ?? BODY,
    lh: L.intro.lh ?? LH,
  });

  const NUM_W = 22;
  const FACT_INDENT = MARGIN + NUM_W;
  const FACT_W = CONTENT_W - NUM_W;
  const factSize = L.facts.size ?? BODY;
  const factLh = L.facts.lh ?? LH;
  let factTop = Math.max(L.facts.top, afterIntroTop + 8);
  doc.facts.forEach((fact, i) => {
    drawTextTop(`${i + 1}.`, MARGIN, factTop, factSize);
    factTop = drawSegmentsTop([{ text: fact }], factTop, {
      x: FACT_INDENT,
      maxW: FACT_W,
      size: factSize,
      lh: factLh,
    }) + 4;
  });

  const sigGap = 30;
  const perLineW = L.signatureLine.width ?? 220;
  const sigStartX = L.signatureLine.x ?? MARGIN;
  const signatureLineTop = Math.max(L.signatureLine.top, factTop + 12);
  const signatureLineY = PAGE_H - signatureLineTop;
  doc.deponents.forEach((_, i) => {
    const x0 = sigStartX + i * (perLineW + sigGap);
    page.drawLine({
      start: { x: x0, y: signatureLineY },
      end: { x: x0 + perLineW, y: signatureLineY },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
  });
  doc.deponents.forEach((d, i) => {
    const x0 = sigStartX + i * (perLineW + sigGap);
    drawTextTop(d.name, x0, signatureLineTop + 15.5, BODY);
  });

  const blockW = L.notaryImage.width ?? 248;
  const blockH = (blockW * notaryBlockImg.height) / notaryBlockImg.width;
  page.drawImage(notaryBlockImg, {
    x: L.notaryImage.x ?? 308,
    y: PAGE_H - L.notaryImage.top - blockH,
    width: blockW,
    height: blockH,
  });

  const ackTitle = "NOTARY ACKNOWLEDGEMENT";
  const ackTitleSize = L.ackTitle.size ?? 11;
  const ackTitleW = bold.widthOfTextAtSize(ackTitle, ackTitleSize);
  drawTextTop(ackTitle, (PAGE_W - ackTitleW) / 2, L.ackTitle.top, ackTitleSize, bold);

  drawSegmentsTop([{ text: buildNotarySentence(doc) }], L.ackText.top, {
    maxW: CONTENT_W - 40,
    size: L.ackText.size ?? 10,
    lh: L.ackText.lh ?? 13,
    center: true,
  });

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
  const notaryBlockBytes = await fetchBytes(notaryBlockAsset.url);


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

  doc.facts.forEach((fact, i) => {
    children.push(
      new Paragraph({
        spacing: { after: 160, line: 300 },
        indent: { left: 720, hanging: 360 },
        children: [
          new TextRun({ text: `${i + 1}. `, font: "Calibri", size: 22 }),
          new TextRun({ text: fact, font: "Calibri", size: 22 }),
        ],
      }),
    );
  });

  const sigLineWPt = doc.layout.signatureLine.width ?? 220;
  const colW = Math.round(sigLineWPt * 20);
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
  const sigCells = doc.deponents.map(
    () =>
      new TableCell({
        width: { size: colW, type: WidthType.DXA },
        borders: {
          ...noBorder,
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        },
        children: [
          new Paragraph({
            spacing: { before: 600 },
            children: [new TextRun({ text: " ", font: "Calibri", size: 22 })],
          }),
        ],
      }),
  );
  const nameCells = doc.deponents.map(
    (d) =>
      new TableCell({
        width: { size: colW, type: WidthType.DXA },
        borders: noBorder,
        children: [new Paragraph({ children: [new TextRun({ text: d.name, font: "Calibri", size: 22 })] })],
      }),
  );
  children.push(
    new Table({
      width: { size: colW * doc.deponents.length, type: WidthType.DXA },
      columnWidths: doc.deponents.map(() => colW),
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

  const rightCell = new TableCell({
    width: { size: 4560, type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.BOTTOM,
    children: [
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
    ],
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
