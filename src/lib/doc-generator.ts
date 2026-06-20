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

  const FOOTER_RESERVED = 240;

  const [sealBytes, sigBytes] = await Promise.all([
    fetchBytes(sealUrl),
    fetchBytes(notarySigUrl),
  ]);
  const sealImg = await pdf.embedPng(sealBytes);
  const sigImg = await pdf.embedPng(sigBytes);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let isFirstPage = true;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    isFirstPage = false;
  };
  const bottomLimit = () => (isFirstPage ? MARGIN + FOOTER_RESERVED : MARGIN);
  const ensure = (needed: number) => {
    if (y - needed < bottomLimit()) newPage();
  };

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

  const drawSegments = (
    segs: Seg[],
    opts: { x?: number; maxW?: number; size?: number; lh?: number } = {},
  ) => {
    const size = opts.size ?? BODY;
    const maxW = opts.maxW ?? CONTENT_W;
    const lh = opts.lh ?? LH;
    const lines = wrapSegments(segs, maxW, size);
    for (const line of lines) {
      ensure(lh);
      while (line.length && /^\s+$/.test(line[0].text)) line.shift();
      let x = opts.x ?? MARGIN;
      for (const s of line) {
        const f = s.bold ? bold : font;
        page.drawText(s.text, { x, y: y - size, size, font: f, color: rgb(0, 0, 0) });
        x += f.widthOfTextAtSize(s.text, size);
      }
      y -= lh;
    }
  };

  // ===== TITLE (centered) =====
  {
    const size = 14;
    const tw = bold.widthOfTextAtSize(doc.title, size);
    page.drawText(doc.title, {
      x: (PAGE_W - tw) / 2,
      y: y - size,
      size,
      font: bold,
      color: rgb(0, 0, 0),
    });
    y -= size + 14;
  }

  // ===== Date =====
  drawSegments([{ text: doc.prettyDate }], { size: BODY, lh: LH });
  y -= 6;

  // ===== Intro =====
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

  // ===== Numbered facts =====
  const NUM_W = 22;
  const FACT_INDENT = MARGIN + NUM_W;
  const FACT_W = CONTENT_W - NUM_W;
  doc.facts.forEach((fact, i) => {
    ensure(LH);
    const numY = y;
    page.drawText(`${i + 1}.`, { x: MARGIN, y: numY - BODY, size: BODY, font, color: rgb(0, 0, 0) });
    drawSegments([{ text: fact }], { x: FACT_INDENT, maxW: FACT_W, size: BODY, lh: LH });
    y -= 4;
  });

  y -= 10;

  // ===== Deponent signature lines =====
  const sigCount = doc.deponents.length;
  const sigGap = 30;
  const sigLineW = (CONTENT_W - sigGap * (sigCount - 1)) / sigCount;
  ensure(50);
  doc.deponents.forEach((_, i) => {
    const x0 = MARGIN + i * (sigLineW + sigGap);
    page.drawLine({
      start: { x: x0, y: y - 8 },
      end: { x: x0 + sigLineW, y: y - 8 },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
  });
  y -= 20;
  doc.deponents.forEach((d, i) => {
    const x0 = MARGIN + i * (sigLineW + sigGap);
    page.drawText(d.name, { x: x0, y: y - BODY, size: BODY, font, color: rgb(0, 0, 0) });
  });

  // ===== ABSOLUTE FOOTER =====
  const FOOTER_BOTTOM = MARGIN;
  const RIGHT_COL_W = 250;
  const LEFT_COL_W = CONTENT_W - RIGHT_COL_W - 20;
  const LEFT_X = MARGIN;
  const RIGHT_X = PAGE_W - MARGIN - RIGHT_COL_W;

  // Right column lines (bottom-up)
  const rightLines: { text: string; bold?: boolean; size?: number; gap?: number }[] = [
    { text: "NOTARY PUBLIC — MARYANA IVANIVN DUBANOVYCH", bold: true, size: 9 },
    { text: "A Notary Public/Commissioner for Oaths in and for the Province of Ontario", size: 8.5 },
    { text: "Expiry Date: September 8, 2026 — LSO Licence No. P14522", size: 8.5 },
    { text: "", size: 6 },
    { text: "Reliance Notary Public", bold: true, size: 8.5 },
    { text: "2711-25 Mabelle Avenue, Etobicoke, Ontario M9A 4Y1 Canada", size: 8.5 },
    { text: "437-263-4264", size: 8.5 },
  ];
  const wrappedRight: { segs: Seg[]; size: number; lh: number }[] = [];
  for (const ln of rightLines) {
    const sz = ln.size ?? 8.5;
    const lh = sz + 2.5;
    if (ln.text === "") {
      wrappedRight.push({ segs: [{ text: " " }], size: sz, lh });
      continue;
    }
    const lines = wrapSegments([{ text: ln.text, bold: ln.bold }], RIGHT_COL_W, sz);
    for (const l of lines) wrappedRight.push({ segs: l, size: sz, lh });
  }
  const rightTextH = wrappedRight.reduce((a, l) => a + l.lh, 0);

  // Draw right column text from bottom up
  let ry = FOOTER_BOTTOM;
  for (let i = wrappedRight.length - 1; i >= 0; i--) {
    const ln = wrappedRight[i];
    let x = RIGHT_X;
    for (const s of ln.segs) {
      const f = s.bold ? bold : font;
      page.drawText(s.text, { x, y: ry, size: ln.size, font: f, color: rgb(0, 0, 0) });
      x += f.widthOfTextAtSize(s.text, ln.size);
    }
    ry += ln.lh;
  }

  // Stamp above the right-column text
  const sealW = 130;
  const sealH = (sealW * sealImg.height) / sealImg.width;
  const sealX = RIGHT_X + (RIGHT_COL_W - sealW) / 2;
  const sealY = FOOTER_BOTTOM + rightTextH + 4;
  page.drawImage(sealImg, { x: sealX, y: sealY, width: sealW, height: sealH });

  // Lawyer signature above the stamp
  const sigW = 110;
  const sigH = (sigW * sigImg.height) / sigImg.width;
  const sigX = RIGHT_X + (RIGHT_COL_W - sigW) / 2;
  const sigY = sealY + sealH + 2;
  page.drawImage(sigImg, { x: sigX, y: sigY, width: sigW, height: sigH });
  const rightTopY = sigY + sigH;

  // Left column: sworn block (bottom-up, aligned to bottom margin)
  const swornText =
    `Sworn/Declared Remotely from the City of ${doc.city} in the Province of Ontario ` +
    `before me in the city of Toronto in the Province of Ontario & Country of Canada ` +
    `This ${doc.dayOfMonth} in accordance with O. Reg 431/20 Administering Oath or ` +
    `Declaration Remotely Ontario.`;
  const swornSize = 9;
  const swornLh = 12;
  const swornLines = wrapSegments([{ text: swornText }], LEFT_COL_W, swornSize);
  let ly = FOOTER_BOTTOM;
  for (let i = swornLines.length - 1; i >= 0; i--) {
    const line = swornLines[i];
    while (line.length && /^\s+$/.test(line[0].text)) line.shift();
    let x = LEFT_X;
    for (const s of line) {
      page.drawText(s.text, { x, y: ly, size: swornSize, font, color: rgb(0, 0, 0) });
      x += font.widthOfTextAtSize(s.text, swornSize);
    }
    ly += swornLh;
  }

  // Notary Acknowledgement (centered) above the two columns
  const ackTopY = Math.max(rightTopY, ly) + 18;
  const ackTitle = "NOTARY ACKNOWLEDGEMENT";
  const ackTitleSize = 11;
  const ackTitleW = bold.widthOfTextAtSize(ackTitle, ackTitleSize);
  page.drawText(ackTitle, {
    x: (PAGE_W - ackTitleW) / 2,
    y: ackTopY,
    size: ackTitleSize,
    font: bold,
    color: rgb(0, 0, 0),
  });
  const ackText = buildNotarySentence(doc);
  const ackSize = 10;
  const ackLh = 13;
  const ackMaxW = CONTENT_W - 40;
  const ackLines = wrapSegments([{ text: ackText }], ackMaxW, ackSize);
  let ay = ackTopY - ackTitleSize - 6;
  for (const line of ackLines) {
    while (line.length && /^\s+$/.test(line[0].text)) line.shift();
    const lw = line.reduce(
      (acc, s) => acc + font.widthOfTextAtSize(s.text, ackSize),
      0,
    );
    let x = (PAGE_W - lw) / 2;
    for (const s of line) {
      page.drawText(s.text, { x, y: ay, size: ackSize, font, color: rgb(0, 0, 0) });
      x += font.widthOfTextAtSize(s.text, ackSize);
    }
    ay -= ackLh;
  }

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

  const colW = Math.floor(9000 / doc.deponents.length);
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
      width: { size: 9000, type: WidthType.DXA },
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

  const sigH = Math.round((110 * 116) / 255);
  const sealHpx = Math.round((150 * 264) / 434);

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
            data: sigBytes,
            transformation: { width: 110, height: sigH },
            altText: { title: "Notary signature", description: "Notary signature", name: "notary_sig" },
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "png",
            data: sealBytes,
            transformation: { width: 150, height: sealHpx },
            altText: { title: "Notary seal", description: "Notary seal", name: "notary_seal" },
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: "NOTARY PUBLIC — MARYANA IVANIVN DUBANOVYCH",
            bold: true,
            font: "Calibri",
            size: 18,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "A Notary Public/Commissioner for Oaths in and for the Province of Ontario",
            font: "Calibri",
            size: 17,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Expiry Date: September 8, 2026 — LSO Licence No. P14522",
            font: "Calibri",
            size: 17,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 120 },
        children: [new TextRun({ text: "Reliance Notary Public", bold: true, font: "Calibri", size: 17 })],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "2711-25 Mabelle Avenue, Etobicoke, Ontario M9A 4Y1 Canada",
            font: "Calibri",
            size: 17,
          }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: "437-263-4264", font: "Calibri", size: 17 })],
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
