import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Generate a professionally formatted DOCX from rendered affidavit text.
 * The first non-empty line is treated as the title (bold, uppercase, centered).
 */
export async function generateDocx(text: string): Promise<Blob> {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  const children: Paragraph[] = [];
  blocks.forEach((block, idx) => {
    const lines = block.split("\n");
    const isTitle = idx === 0 && block === block.toUpperCase() && block.length < 80;
    const isHeading = !isTitle && lines.length === 1 && block === block.toUpperCase() && block.length < 60;

    const runs: TextRun[] = [];
    lines.forEach((line, i) => {
      if (i > 0) runs.push(new TextRun({ text: "", break: 1 }));
      runs.push(
        new TextRun({
          text: line,
          font: "Times New Roman",
          size: isTitle ? 32 : isHeading ? 26 : 22,
          bold: isTitle || isHeading,
        }),
      );
    });

    children.push(
      new Paragraph({
        children: runs,
        alignment: isTitle ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 200 },
      }),
    );
  });

  const doc = new Document({
    creator: "Neptora",
    title: "Affidavit",
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate a Letter-size PDF from rendered affidavit text.
 * Times-Roman 11pt with word-wrap and automatic page breaks.
 */
export async function generatePdf(text: string): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 72;
  const FONT_SIZE = 11;
  const LINE_HEIGHT = 14;
  const TITLE_SIZE = 16;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const wrap = (line: string, fnt = font, size = FONT_SIZE): string[] => {
    if (!line) return [""];
    const words = line.split(" ");
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (fnt.widthOfTextAtSize(test, size) <= CONTENT_WIDTH) {
        cur = test;
      } else {
        if (cur) out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
    return out;
  };

  const draw = (line: string, opts: { bold?: boolean; size?: number; center?: boolean } = {}) => {
    const size = opts.size ?? FONT_SIZE;
    const fnt = opts.bold ? bold : font;
    const lh = Math.max(LINE_HEIGHT, size * 1.3);
    if (y - lh < MARGIN) newPage();
    const width = fnt.widthOfTextAtSize(line, size);
    const x = opts.center ? (PAGE_WIDTH - width) / 2 : MARGIN;
    page.drawText(line, { x, y, size, font: fnt, color: rgb(0, 0, 0) });
    y -= lh;
  };

  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  blocks.forEach((block, idx) => {
    const lines = block.split("\n");
    const isTitle = idx === 0 && block === block.toUpperCase() && block.length < 80;
    const isHeading = !isTitle && lines.length === 1 && block === block.toUpperCase() && block.length < 60;

    for (const line of lines) {
      const wrapped = wrap(line, isTitle || isHeading ? bold : font, isTitle ? TITLE_SIZE : isHeading ? 13 : FONT_SIZE);
      for (const w of wrapped) {
        draw(w, { bold: isTitle || isHeading, size: isTitle ? TITLE_SIZE : isHeading ? 13 : FONT_SIZE, center: isTitle });
      }
    }
    y -= LINE_HEIGHT * 0.6; // paragraph spacing
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
