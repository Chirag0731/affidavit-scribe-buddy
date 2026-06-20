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
import sealUrl from "@/assets/notary-seal.png";
import notarySigUrl from "@/assets/notary-signature.png";
import type { AffidavitDoc } from "@/types/neptora";
import { buildIntroSentence, buildNotarySentence } from "@/types/neptora";

// ----- Notary constants (match the uploaded PDF exactly) -----
const NOTARY_NAME = "MARYANA IVANIVN DUBANOVYCH";
const NOTARY_BLOCK = [
  "A Notary Public/Commissioner for Oaths",
  "in and for the Province of Ontario",
  "Expiry Date: September 8, 2026",
  "LSO Licence No. P14522",
];
const NOTARY_FIRM = [
  "Reliance Notary Public",
  "Maryana Ivanivn Dubanovych",
  "2711-25 Mabelle Avenue",
  "Etobicoke, Ontario M9A 4Y1 Canada",
  "437-263-4264",
];

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
  const MARGIN = 54; // 0.75 in
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BODY = 10.5;
  const LH = 15;

  const [sealBytes, sigBytes] = await Promise.all([
    fetchBytes(sealUrl),
    fetchBytes(notarySigUrl),
  ]);
  const sealImg = await pdf.embedPng(sealBytes);
  const sigImg = await pdf.embedPng(sigBytes);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  // Wrap that supports mixed bold/regular segments.
  interface Seg { text: string; bold?: boolean; }
  const wrapSegments = (segs: Seg[], maxW: number, size: number): Seg[][] => {
    const lines: Seg[][] = [];
    let cur: Seg[] = [];
    let curW = 0;
    const widthOf = (t: string, b?: boolean) => (b ? bold : font).widthOfTextAtSize(t, size);

    for (const seg of segs) {
      const words = seg.text.split(/(\s+)/); // keep spaces
      for (const w of words) {
        if (!w) continue;
        const ww = widthOf(w, seg.bold);
        if (curW + ww > maxW && cur.length > 0) {
          lines.push(cur);
          cur = [];
          curW = 0;
          if (/^\s+$/.test(w)) continue;
        }
        cur.push({ text: w, bold: seg.bold });
        curW += ww;
      }
    }
    if (cur.length) lines.push(cur);
    return lines;
  };

  const drawSegments = (
    segs: Seg[],
    opts: { x?: number; maxW?: number; size?: number; align?: "left" | "center"; lh?: number } = {},
  ) => {
    const size = opts.size ?? BODY;
    const maxW = opts.maxW ?? CONTENT_W;
    const lh = opts.lh ?? LH;
    const lines = wrapSegments(segs, maxW, size);
    for (const line of lines) {
      ensure(lh);
      // Trim leading whitespace segs from line
      while (line.length && /^\s+$/.test(line[0].text)) line.shift();
      const lineWidth = line.reduce(
        (acc, s) => acc + (s.bold ? bold : font).widthOfTextAtSize(s.text, size),
        0,
      );
      let x = opts.x ?? MARGIN;
      if (opts.align === "center") x = (PAGE_W - lineWidth) / 2;
      for (const s of line) {
        page.drawText(s.text, { x, y: y - size, size, font: s.bold ? bold : font, color: rgb(0, 0, 0) });
        x += (s.bold ? bold : font).widthOfTextAtSize(s.text, size);
      }
      y -= lh;
    }
  };

  const drawText = (text: string, opts: Parameters<typeof drawSegments>[1] & { bold?: boolean } = {}) => {
    drawSegments([{ text, bold: opts.bold }], opts);
  };

  // ----- TITLE -----
  ensure(40);
  drawText(doc.title, { bold: true, size: 13, align: "center", lh: 22 });
  y -= 8;

  // ----- Date -----
  drawText(doc.prettyDate, { size: BODY, lh: LH });
  y -= 6;

  // ----- Intro with bold "MAKE OATH AND SAY AS FOLLOWS:" -----
  const intro = buildIntroSentence(doc);
  const idx = intro.indexOf("MAKE OATH AND SAY AS FOLLOWS:");
  const introSegs: Seg[] =
    idx >= 0
      ? [
          { text: intro.slice(0, idx) },
          { text: "MAKE OATH AND SAY AS FOLLOWS:", bold: true },
        ]
      : [{ text: intro }];
  drawSegments(introSegs, { size: BODY, lh: LH });
  y -= 8;

  // ----- Numbered facts (hanging indent) -----
  const NUM_W = 22;
  const FACT_INDENT = MARGIN + NUM_W;
  const FACT_W = CONTENT_W - NUM_W;
  doc.facts.forEach((fact, i) => {
    ensure(LH * 2);
    // Draw the number at MARGIN, then the fact wrapped at FACT_INDENT
    const startY = y;
    // Print number
    page.drawText(`${i + 1}.`, { x: MARGIN, y: y - BODY, size: BODY, font, color: rgb(0, 0, 0) });
    drawSegments([{ text: fact }], { x: FACT_INDENT, maxW: FACT_W, size: BODY, lh: LH });
    // small gap between facts
    if (y === startY) y -= LH; // safety
    y -= 4;
  });

  y -= 14;

  // ----- Signature lines -----
  const sigCount = doc.deponents.length;
  const sigGap = 24;
  const sigLineW = (CONTENT_W - sigGap * (sigCount - 1)) / sigCount;
  ensure(60);
  // Draw underlines
  doc.deponents.forEach((_, i) => {
    const x0 = MARGIN + i * (sigLineW + sigGap);
    page.drawLine({
      start: { x: x0, y: y - 8 },
      end: { x: x0 + sigLineW, y: y - 8 },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
  });
  y -= 22;
  doc.deponents.forEach((d, i) => {
    const x0 = MARGIN + i * (sigLineW + sigGap);
    page.drawText(d.name, { x: x0, y: y - BODY, size: BODY, font, color: rgb(0, 0, 0) });
  });
  y -= LH;
  y -= 18;

  // ----- NOTARY ACKNOWLEDGEMENT -----
  ensure(60);
  drawText("NOTARY ACKNOWLEDGEMENT", { bold: true, align: "center", size: BODY + 0.5, lh: LH + 2 });
  y -= 4;
  drawText(buildNotarySentence(doc), { align: "center", size: BODY, lh: LH, maxW: CONTENT_W - 40, x: MARGIN + 20 });
  y -= 22;

  // ----- THREE-COLUMN FOOTER -----
  ensure(180);
  const footerTop = y;
  const colGap = 8;
  const leftW = 240;
  const sealW = 110;
  const seal_h = (sealW * sealImg.height) / sealImg.width;
  const rightX = PAGE_W - MARGIN - sealW;
  const midX = MARGIN + leftW + colGap;
  const midW = rightX - midX - colGap;

  // Left column: Sworn/Declared block
  const leftLines = [
    `Sworn/Declared Remotely from the City`,
    `of ${doc.city} in the Province of Ontario`,
    `before me in the city of Toronto in the`,
    `Province of Ontario & Country of`,
    `Canada This ${doc.dayOfMonth}`,
    `in accordance with O. Reg 431/20`,
    `Administering Oath or Declaration Remotely Ontario.`,
  ];
  let ly = footerTop;
  for (const line of leftLines) {
    drawSegments([{ text: line }], { x: MARGIN, maxW: leftW, size: 9.5, lh: 12 });
    ly -= 12;
  }
  const leftEndY = y;

  // Middle column: braces + NOTARY PUBLIC + signature + name + small block
  y = footerTop;
  // 5 braces stacked
  for (let i = 0; i < 5; i++) {
    page.drawText("}", { x: midX, y: y - 10, size: 11, font: bold, color: rgb(0, 0, 0) });
    if (i === 0) {
      page.drawText("NOTARY PUBLIC", {
        x: midX + 14, y: y - 10, size: 10.5, font: bold, color: rgb(0, 0, 0),
      });
    }
    y -= 12;
  }
  // Notary signature image overlaid above the braces (between lines)
  const sigW = 70;
  const sig_h = (sigW * sigImg.height) / sigImg.width;
  page.drawImage(sigImg, {
    x: midX + 18,
    y: footerTop - 40,
    width: sigW,
    height: sig_h,
  });
  // Underline + printed name + tiny block
  page.drawLine({
    start: { x: midX + 14, y: y - 4 },
    end: { x: midX + midW, y: y - 4 },
    thickness: 0.6,
    color: rgb(0, 0, 0),
  });
  y -= 14;
  page.drawText(NOTARY_NAME, { x: midX + 14, y: y - 9, size: 9.5, font: bold, color: rgb(0, 0, 0) });
  y -= 12;
  for (const line of NOTARY_BLOCK) {
    page.drawText(line, { x: midX + 14, y: y - 8, size: 7.5, font, color: rgb(0, 0, 0) });
    y -= 9;
  }
  y -= 8;
  page.drawText("NO LEGAL ADVICE SOUGHT OR GIVEN", {
    x: midX + 8, y: y - 8, size: 8, font, color: rgb(0, 0, 0),
  });
  const midEndY = y;

  // Right column: seal + firm block
  y = footerTop - 4;
  page.drawImage(sealImg, {
    x: rightX,
    y: y - seal_h,
    width: sealW,
    height: seal_h,
  });
  y -= seal_h + 6;
  for (const line of NOTARY_FIRM) {
    const isFirst = line === NOTARY_FIRM[0];
    const fnt = isFirst ? bold : font;
    const sz = isFirst ? 8.5 : 7.5;
    const w = fnt.widthOfTextAtSize(line, sz);
    page.drawText(line, {
      x: rightX + (sealW - w) / 2,
      y: y - sz,
      size: sz,
      font: fnt,
      color: rgb(0, 0, 0),
    });
    y -= 10;
  }
  const rightEndY = y;
  y = Math.min(leftEndY, midEndY, rightEndY) - 6;

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

// =====================================================================
// DOCX
// =====================================================================

export async function generateDocx(doc: AffidavitDoc): Promise<Blob> {
  const [sealBytes, sigBytes] = await Promise.all([
    fetchBytes(sealUrl),
    fetchBytes(notarySigUrl),
  ]);

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

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: doc.title, bold: true, size: 26, font: "Calibri" }),
      ],
    }),
  );

  // Date
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: doc.prettyDate, font: "Calibri", size: 22 })],
    }),
  );

  // Intro
  children.push(
    new Paragraph({ spacing: { after: 200 }, children: introRuns }),
  );

  // Facts (numbered)
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

  // Signature lines (table)
  const sigCells = doc.deponents.map(
    (d) =>
      new TableCell({
        width: { size: Math.floor(9000 / doc.deponents.length), type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
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
        width: { size: Math.floor(9000 / doc.deponents.length), type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        children: [new Paragraph({ children: [new TextRun({ text: d.name, font: "Calibri", size: 22 })] })],
      }),
  );
  children.push(
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: doc.deponents.map(() => Math.floor(9000 / doc.deponents.length)),
      rows: [new TableRow({ children: sigCells }), new TableRow({ children: nameCells })],
    }),
  );

  // Notary acknowledgement
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
      children: [
        new TextRun({ text: "NOTARY ACKNOWLEDGEMENT", bold: true, size: 22, font: "Calibri" }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: buildNotarySentence(doc), font: "Calibri", size: 22 })],
    }),
  );

  // Footer block as a 3-column borderless table
  const leftBlock = [
    `Sworn/Declared Remotely from the City`,
    `of ${doc.city} in the Province of Ontario`,
    `before me in the city of Toronto in the`,
    `Province of Ontario & Country of`,
    `Canada This ${doc.dayOfMonth}`,
    `in accordance with O. Reg 431/20`,
    `Administering Oath or Declaration Remotely Ontario.`,
  ];
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  const leftCell = new TableCell({
    width: { size: 4000, type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.TOP,
    children: leftBlock.map(
      (l) =>
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: l, font: "Calibri", size: 18 })],
        }),
    ),
  });

  const midCell = new TableCell({
    width: { size: 3000, type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "} ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: "NOTARY PUBLIC", bold: true, font: "Calibri", size: 20 }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: "}", bold: true, font: "Calibri", size: 20 })] }),
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: sigBytes,
            transformation: { width: 90, height: 36 },
            altText: { title: "Notary signature", description: "Maryana Dubanovych signature", name: "notary_sig" },
          }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: "}", bold: true, font: "Calibri", size: 20 })] }),
      new Paragraph({
        children: [new TextRun({ text: NOTARY_NAME, bold: true, font: "Calibri", size: 18 })],
      }),
      ...NOTARY_BLOCK.map(
        (l) =>
          new Paragraph({ children: [new TextRun({ text: l, font: "Calibri", size: 14 })] }),
      ),
      new Paragraph({
        spacing: { before: 120 },
        children: [new TextRun({ text: "NO LEGAL ADVICE SOUGHT OR GIVEN", font: "Calibri", size: 16 })],
      }),
    ],
  });

  const rightCell = new TableCell({
    width: { size: 2360, type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "png",
            data: sealBytes,
            transformation: { width: 140, height: 84 },
            altText: { title: "Notary seal", description: "Reliance Notary Public seal", name: "notary_seal" },
          }),
        ],
      }),
      ...NOTARY_FIRM.map(
        (l, i) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: l, font: "Calibri", size: i === 0 ? 16 : 14, bold: i === 0 }),
            ],
          }),
      ),
    ],
  });

  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4000, 3000, 2360],
      rows: [
        new TableRow({
          children: [leftCell, midCell, rightCell],
          height: { value: 2400, rule: HeightRule.ATLEAST },
        }),
      ],
    }),
  );

  const wordDoc = new Document({
    creator: "Neptora",
    title: doc.title,
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
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
