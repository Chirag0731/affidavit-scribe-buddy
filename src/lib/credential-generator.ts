import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB } from "pdf-lib";
import type { CredentialSpec } from "@/types/credentials";
import { GPA_ROW, TERM_ROW, computeAverage, designMeta } from "@/types/credentials";

import sheridanLogo from "@/assets/credentials/sheridan.png.asset.json";
import niitLogo from "@/assets/credentials/niit.png.asset.json";
import marcaLogo from "@/assets/credentials/marca.png.asset.json";
import cdiLogo from "@/assets/credentials/cdi-logo.png.asset.json";
import yorkWord from "@/assets/credentials/york-word.png.asset.json";
import yorkSeal from "@/assets/credentials/york-seal.png.asset.json";
import yorkTexture from "@/assets/credentials/york-texture.jpg.asset.json";
import fhsSeal from "@/assets/credentials/fhs-seal.png.asset.json";
import sigYork from "@/assets/credentials/sig-york.png.asset.json";
import sigMarca from "@/assets/credentials/sig-marca.png.asset.json";
import sigFhs1 from "@/assets/credentials/sig-fhs1.png.asset.json";
import sigFhs2 from "@/assets/credentials/sig-fhs2.png.asset.json";
import uopLogo from "@/assets/credentials/uop-logo.png.asset.json";
import uopSeal from "@/assets/credentials/uop-seal.png.asset.json";
import queensLogo from "@/assets/credentials/queens-logo.png.asset.json";
import queensSig from "@/assets/credentials/queens-sig.png.asset.json";
import lseLogo from "@/assets/credentials/lse-logo.png.asset.json";
import lseSeal from "@/assets/credentials/lse-seal.png.asset.json";
import lseSig from "@/assets/credentials/lse-sig.png.asset.json";

// ------------------------------------------------------------------ helpers

const cache = new Map<string, Uint8Array | null>();

async function bytes(url: string): Promise<Uint8Array | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const arr = new Uint8Array(await res.arrayBuffer());
    cache.set(url, arr);
    return arr;
  } catch {
    cache.set(url, null);
    return null;
  }
}

function hex(color: string): RGB {
  const h = color.replace("#", "");
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

const clean = (t: string) =>
  (t ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/[^\x20-\x7E]/g, "");

interface Ctx {
  page: PDFPage;
  H: number;
  reg: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

type TextOpts = {
  size?: number;
  font?: PDFFont;
  color?: string;
  align?: "left" | "center" | "right";
  /** width used for center/right alignment (x is the box start) */
  width?: number;
};

function text(ctx: Ctx, str: string, x: number, top: number, o: TextOpts = {}) {
  const s = clean(str);
  if (!s.trim()) return;
  const size = o.size ?? 8;
  const font = o.font ?? ctx.reg;
  let px = x;
  if (o.align && o.align !== "left") {
    const w = font.widthOfTextAtSize(s, size);
    const boxW = o.width ?? 0;
    px = o.align === "center" ? x + (boxW - w) / 2 : x + boxW - w;
  }
  ctx.page.drawText(s, {
    x: px,
    y: ctx.H - top - size,
    size,
    font,
    color: hex(o.color ?? "#000000"),
  });
}

function wrap(font: PDFFont, str: string, size: number, maxW: number): string[] {
  const words = clean(str).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function line(ctx: Ctx, x1: number, top: number, x2: number, thickness = 0.7, color = "#000000") {
  ctx.page.drawLine({
    start: { x: x1, y: ctx.H - top },
    end: { x: x2, y: ctx.H - top },
    thickness,
    color: hex(color),
  });
}

function box(
  ctx: Ctx,
  x: number,
  top: number,
  w: number,
  h: number,
  opts: { fill?: string; border?: string; borderWidth?: number } = {},
) {
  ctx.page.drawRectangle({
    x,
    y: ctx.H - top - h,
    width: w,
    height: h,
    color: opts.fill ? hex(opts.fill) : undefined,
    borderColor: opts.border ? hex(opts.border) : undefined,
    borderWidth: opts.border ? (opts.borderWidth ?? 0.7) : undefined,
  });
}

async function image(
  ctx: Ctx,
  pdf: PDFDocument,
  url: string,
  x: number,
  top: number,
  w: number,
  h?: number,
  kind: "png" | "jpg" = "png",
) {
  const data = await bytes(url);
  if (!data) return;
  try {
    const img = kind === "jpg" ? await pdf.embedJpg(data) : await pdf.embedPng(data);
    const height = h ?? (w * img.height) / img.width;
    ctx.page.drawImage(img, { x, y: ctx.H - top - height, width: w, height });
  } catch {
    /* ignore unreadable asset */
  }
}

// ------------------------------------------------------------------ entry

export async function generateCredentialPdf(spec: CredentialSpec): Promise<Blob> {
  const meta = designMeta(spec.design);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([meta.pageW, meta.pageH]);
  const ctx: Ctx = {
    page,
    H: meta.pageH,
    reg: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    boldItalic: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
    mono: await pdf.embedFont(StandardFonts.Courier),
    monoBold: await pdf.embedFont(StandardFonts.CourierBold),
  };
  const times = await pdf.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  switch (spec.design) {
    case "sheridan":
      await sheridan(ctx, pdf, spec);
      break;
    case "niit":
      await niit(ctx, pdf, spec);
      break;
    case "york":
      await york(ctx, pdf, spec);
      break;
    case "marca":
      await marca(ctx, pdf, spec);
      break;
    case "cdi":
      await cdi(ctx, pdf, spec, times, timesBold);
      break;
    case "fernourt":
      await fernourt(ctx, pdf, spec, times, timesBold);
      break;
    case "phoenix":
      await phoenix(ctx, pdf, spec, times, timesBold);
      break;
    case "queens":
      await queens(ctx, pdf, spec, times, timesBold);
      break;
    case "lse":
      await lse(ctx, pdf, spec, times, timesBold);
      break;
    case "fleming":
      await fleming(ctx, pdf, spec);
      break;
  }

  const out = await pdf.save();
  return new Blob([out as BlobPart], { type: "application/pdf" });
}

// ------------------------------------------------------------------ Sheridan

async function sheridan(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec) {
  text(ctx, "GRADE REPORT", 0, 52, { size: 12, font: ctx.boldItalic, align: "center", width: 612 });

  let t = 78;
  for (const l of s.addressLines) {
    text(ctx, l, 45, t, { size: 6.4, align: "center", width: 150 });
    t += 8.6;
  }

  let n = 82;
  for (const l of s.notes) {
    text(ctx, l, 395, n, { size: 6.2 });
    n += 8.6;
  }

  await image(ctx, pdf, sheridanLogo.url, 250, 92, 112);

  let y = 165;
  text(ctx, s.studentName, 45, y, { size: 7.6 });
  y += 11;
  for (const l of s.studentAddress) {
    text(ctx, l, 45, y, { size: 7.6 });
    y += 11;
  }
  text(ctx, `ID: ${s.studentId}`, 380, 208, { size: 7.6, align: "right", width: 180 });

  text(ctx, "Program", 45, 262, { size: 7.6 });
  text(ctx, "Plan", 215, 262, { size: 7.6 });
  text(ctx, s.program, 45, 274, { size: 7.6 });
  text(ctx, s.plan, 215, 274, { size: 7.6 });
  text(ctx, s.term, 380, 286, { size: 7.6, align: "right", width: 187 });

  const heads: Array<[string, number, "left" | "right"]> = [
    ["Subjec", 62, "left"],
    ["Course", 133, "left"],
    ["Course Name", 232, "left"],
    ["Grade", 400, "left"],
    ["Credits", 480, "left"],
  ];
  for (const [label, x] of heads) text(ctx, label, x, 306, { size: 7.6 });

  let rt = 322;
  for (const c of s.courses) {
    text(ctx, c.code, 62, rt, { size: 7.6 });
    text(ctx, c.num ?? "", 133, rt, { size: 7.6 });
    text(ctx, c.name, 232, rt, { size: 7.6 });
    text(ctx, c.grade, 400, rt, { size: 7.6 });
    text(ctx, c.credits ?? "", 480, rt, { size: 7.6 });
    rt += 11.5;
  }

  text(ctx, s.printDate, 380, 716, { size: 7, align: "right", width: 187 });
}

// ---------------------------------------------------------------------- NIIT

async function niit(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec) {
  const W = 595;
  text(ctx, s.extra.version ?? "", 400, 30, { size: 7, align: "right", width: 160 });
  await image(ctx, pdf, niitLogo.url, 240, 58, 108);

  text(ctx, `SPR ID : ${s.extra.sprId ?? ""}`, 400, 104, { size: 7.5 });
  text(ctx, `Date : ${s.issueDate}`, 400, 120, { size: 7.5 });

  text(ctx, "Semester Performance Report", 0, 128, { size: 9.5, font: ctx.bold, align: "center", width: W });

  const label = (l: string, v: string, x: number, top: number, vx: number) => {
    text(ctx, l, x, top, { size: 7.5, font: ctx.bold });
    text(ctx, `: ${v}`, vx, top, { size: 7.5 });
  };
  label("Registration Code", s.studentId, 33, 168, 110);
  label("Name", s.studentName, 222, 168, 282);
  label("Batch Code", s.extra.batchCode ?? "", 33, 186, 110);
  label("Semester", s.term, 222, 186, 282);
  text(ctx, "End Date:", 425, 180, { size: 7.5, font: ctx.bold });
  text(ctx, s.endDate, 470, 180, { size: 7.5 });

  text(ctx, "Performance :", 33, 218, { size: 7.5, font: ctx.bold });

  line(ctx, 33, 238, 562, 0.6);
  const cols: Array<[string, number]> = [
    ["Appraisal Type", 33],
    ["Appraisal Details", 148],
    ["Weightage", 305],
    ["Percentage Marks", 380],
    ["Weighted Score", 470],
  ];
  for (const [l, x] of cols) text(ctx, l, x, 243, { size: 7.5, font: ctx.bold });
  line(ctx, 33, 258, 562, 0.6);

  let t = 266;
  for (const c of s.courses) {
    text(ctx, c.code, 33, t, { size: 7.5, font: ctx.bold });
    text(ctx, c.name, 148, t, { size: 7.5 });
    text(ctx, c.credits ?? "", 305, t, { size: 7.5, align: "right", width: 40 });
    text(ctx, c.grade, 380, t, { size: 7.5, align: "right", width: 55 });
    text(ctx, c.extra ?? "", 470, t, { size: 7.5, align: "right", width: 50 });
    t += 19;
  }
  line(ctx, 33, t + 4, 562, 0.6);

  const avg = computeAverage(s) || s.average;
  text(ctx, s.averageLabel, 33, t + 16, { size: 7.5, font: ctx.bold });
  text(ctx, `: ${avg}`, 340, t + 16, { size: 7.5, font: ctx.bold });
  text(ctx, "Cumulative Weighted Average Performance(CWAP)", 33, t + 34, { size: 7.5, font: ctx.bold });
  text(ctx, `: ${s.extra.cwap ?? avg}`, 340, t + 34, { size: 7.5, font: ctx.bold });

  let nt = 655;
  for (const note of s.notes) {
    text(ctx, note, 33, nt, { size: 6.4 });
    nt += 10;
  }

  line(ctx, 33, 795, 562, 0.6);
  text(ctx, s.extra.footerLeft ?? "", 33, 800, { size: 6.5 });
  text(ctx, s.extra.footerRight ?? "", 460, 800, { size: 6.5, align: "right", width: 102 });
}

// ---------------------------------------------------------------------- York

async function york(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec) {
  const W = 612;
  await image(ctx, pdf, yorkTexture.url, 8, 8, W - 16, 776, "jpg");
  box(ctx, 8, 8, W - 16, 74, { fill: "#ffffff" });

  await image(ctx, pdf, yorkWord.url, 18, 16, 124);
  let a = 22;
  for (const l of s.addressLines) {
    text(ctx, l, 152, a, { size: 6.8, font: ctx.bold });
    a += 9.5;
  }
  await image(ctx, pdf, yorkSeal.url, 520, 14, 62);

  text(ctx, `${s.extra.pageLabel ?? "Page 1 of1"}`, 300, 88, { size: 7, font: ctx.bold });
  text(ctx, `Date Printed: ${s.printDate}`, 300, 88, { size: 7, font: ctx.bold, align: "right", width: 290 });

  const M = 30;
  const SZ = 7;
  const LH = 9.6;
  let t = 108;
  const mono = (str: string, boldFace = false) => {
    text(ctx, str, M, t, { size: SZ, font: boldFace ? ctx.monoBold : ctx.mono });
    t += LH;
  };

  mono(`Name: ${s.studentName}`, true);
  mono(`Student Number: ${s.studentId}`, true);
  t += 4;
  mono("*".repeat(78));
  t += 4;
  if (s.notes.length) {
    mono("Scholarships and Awards", true);
    for (const n of s.notes) mono(`   ${n}`);
    t += 4;
  }
  if (s.extra.degreeLine) {
    mono("Degrees Awarded", true);
    mono(`   ${s.extra.degreeLine}`);
    t += 4;
  }
  mono("Academic Program History", true);
  mono(`   ${s.program}`);
  if (s.plan) mono(`   ${s.plan}`);
  t += 6;
  mono("*".repeat(78));
  t += 4;
  mono(`${s.term}`, true);
  mono(`${s.program}`);
  t += 4;
  mono("Course          Description                             Grade  Units   Class Info");
  line(ctx, M, t - 2, W - M, 0.5);
  t += 3;
  for (const c of s.courses) {
    const code = `${c.code} ${c.num ?? ""}`.padEnd(16).slice(0, 16);
    const name = clean(c.name).replace(/\s+/g, " ").padEnd(40).slice(0, 40);
    const grade = clean(c.grade).padEnd(6).slice(0, 6);
    const units = clean(c.credits ?? "").padStart(5);
    mono(`${code}${name}${grade}${units}   ${c.extra ?? ""}`);
  }
  t += 10;
  if (s.average) mono(`Session Grade Point Average: ${s.average}`, true);
  t += 6;
  mono("*".repeat(78));
  t += 4;
  mono("End of Official Transcript", true);

  await image(ctx, pdf, sigYork.url, 415, 650, 118, 46);
  line(ctx, 380, 700, 560, 0.6);
  const titleLines = (s.officialTitle || "").split("\n");
  text(ctx, s.officialName, 380, 704, { size: 7, align: "center", width: 180 });
  let ot = 714;
  for (const l of titleLines) {
    text(ctx, l, 380, ot, { size: 7, align: "center", width: 180 });
    ot += 9;
  }
}

// --------------------------------------------------------------------- MARCA

async function marca(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec) {
  const W = 612;
  await image(ctx, pdf, marcaLogo.url, 26, 18, 118);

  let a = 20;
  for (const [i, l] of s.addressLines.entries()) {
    text(ctx, l, 380, a, { size: 7.4, font: i === 0 ? ctx.bold : ctx.reg, align: "right", width: 202 });
    a += 10.5;
  }

  box(ctx, 14, 72, W - 28, 24, { fill: "#000000" });
  text(ctx, "Student Transcript", 14, 78, { size: 10, font: ctx.bold, color: "#ffffff", align: "center", width: W - 28 });

  box(ctx, 14, 96, W - 28, 470, { border: "#cccccc", borderWidth: 0.7 });

  const pair = (l: string, v: string, x: number, vx: number, top: number) => {
    text(ctx, l, x, top, { size: 7.4 });
    text(ctx, v, vx, top, { size: 7.4, font: ctx.bold });
  };
  pair("Student ID", s.studentId, 24, 130, 108);
  pair("Status", s.extra.status ?? "", 310, 425, 108);
  pair("Student Name", s.studentName, 24, 130, 126);
  pair("Start Date", s.startDate, 310, 425, 126);
  pair("Program Name", s.program, 24, 130, 144);
  pair("End Date", s.endDate, 310, 425, 144);
  text(ctx, "Address", 24, 162, { size: 7.4 });
  let at = 162;
  for (const l of s.studentAddress) {
    text(ctx, l, 130, at, { size: 7.4, font: ctx.bold });
    at += 11;
  }
  pair("Completed Hours", s.totalHours, 310, 425, 162);
  pair("Credentials", s.credential, 24, 130, at + 4);

  const headTop = 212;
  box(ctx, 14, headTop, W - 28, 17, { fill: "#000000" });
  text(ctx, "Class", 24, headTop + 4.5, { size: 7.6, font: ctx.bold, color: "#ffffff" });
  text(ctx, "Final Mark", 425, headTop + 4.5, { size: 7.6, font: ctx.bold, color: "#ffffff" });

  let t = headTop + 22;
  s.courses.forEach((c, i) => {
    if (i % 2 === 0) box(ctx, 20, t - 4, W - 40, 16, { fill: "#f4f4f4" });
    text(ctx, c.name, 24, t, { size: 7.4 });
    text(ctx, c.grade, 425, t, { size: 7.4 });
    t += 17;
  });

  const avgTop = Math.max(t + 6, 470);
  box(ctx, 14, avgTop, W - 28, 17, { fill: "#000000" });
  text(ctx, "Average", 24, avgTop + 4.5, { size: 7.6, font: ctx.bold, color: "#ffffff" });
  text(ctx, computeAverage(s) || s.average, 425, avgTop + 4.5, { size: 7.6, font: ctx.bold, color: "#ffffff" });

  await image(ctx, pdf, sigMarca.url, 240, avgTop + 26, 130);
  line(ctx, 170, avgTop + 72, 460, 0.7);
  text(ctx, s.officialTitle || "School Official", 170, avgTop + 77, { size: 7.4, font: ctx.bold, align: "center", width: 290 });

  text(ctx, `Printed On: ${s.printDate}`, 16, 716, { size: 7 });
}

// ----------------------------------------------------------------------- CDI

async function cdi(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec, times: PDFFont, timesBold: PDFFont) {
  const W = 612;
  const navy = "#1f3864";
  box(ctx, 18, 18, W - 36, 756, { border: navy, borderWidth: 1.4 });
  box(ctx, 22, 22, W - 44, 748, { border: navy, borderWidth: 0.5 });

  await image(ctx, pdf, cdiLogo.url, 44, 40, 150);
  let a = 46;
  for (const l of s.addressLines) {
    text(ctx, l, 210, a, { size: 8, font: times, align: "center", width: 180 });
    a += 10.5;
  }

  text(ctx, "Transcript of Marks for:", 400, 46, { size: 8.5, font: ctx.bold });
  text(ctx, s.studentName.toUpperCase(), 400, 60, { size: 9, font: times });

  const pair = (l: string, v: string, x: number, vx: number, top: number, vFont = times) => {
    text(ctx, l, x, top, { size: 8, font: ctx.bold });
    text(ctx, v, vx, top, { size: 8, font: vFont });
  };
  pair("Program:", s.program, 44, 110, 108);
  pair("Start Date:", s.startDate, 44, 110, 122);
  pair("End Date:", s.endDate, 44, 110, 136);
  pair("Student Number:", s.studentId, 380, 470, 122, ctx.bold);

  const boxTop = 176;
  const boxX = 78;
  const boxW = 456;
  text(ctx, "Courses", 200, boxTop - 14, { size: 8, font: ctx.bold });
  text(ctx, "Hours", 390, boxTop - 14, { size: 8, font: ctx.bold, align: "center", width: 46 });
  text(ctx, "Marks", 462, boxTop - 14, { size: 8, font: ctx.bold, align: "center", width: 46 });

  let t = boxTop + 10;
  for (const c of s.courses) {
    if (c.code) text(ctx, c.code, 88, t, { size: 7.6, font: ctx.bold });
    text(ctx, c.name, 190, t, { size: 7.6, font: times });
    text(ctx, c.credits ?? "", 390, t, { size: 7.6, font: times, align: "center", width: 46 });
    text(ctx, c.grade, 462, t, { size: 7.6, font: times, align: "center", width: 46 });
    t += 12.6;
  }
  t += 4;
  line(ctx, boxX, t, boxX + boxW, 0.6);
  t += 5;
  text(ctx, s.averageLabel, 190, t, { size: 7.8, font: ctx.bold });
  text(ctx, s.totalHours, 390, t, { size: 7.8, font: ctx.bold, align: "center", width: 46 });
  text(ctx, computeAverage(s) || s.average, 462, t, { size: 7.8, font: ctx.bold, align: "center", width: 46 });

  const boxH = t + 14 - boxTop;
  box(ctx, boxX, boxTop, boxW, boxH, { border: "#333333", borderWidth: 0.7 });
  ctx.page.drawLine({
    start: { x: 380, y: ctx.H - boxTop },
    end: { x: 380, y: ctx.H - boxTop - boxH },
    thickness: 0.7,
    color: hex("#333333"),
  });
  ctx.page.drawLine({
    start: { x: 448, y: ctx.H - boxTop },
    end: { x: 448, y: ctx.H - boxTop - boxH },
    thickness: 0.7,
    color: hex("#333333"),
  });

  const foot = Math.max(boxTop + boxH + 40, 520);
  text(ctx, s.issueDate, 44, foot, { size: 8, font: times });
  await image(ctx, pdf, sigMarca.url, 60, foot + 14, 120);
  line(ctx, 44, foot + 58, 240, 0.7);
  text(ctx, s.officialTitle, 44, foot + 63, { size: 7.4, font: times });

  let nt = foot;
  s.notes.forEach((n, i) => {
    const lines = wrap(i === 0 ? ctx.bold : times, n, 7.4, 230);
    for (const l of lines) {
      text(ctx, (i > 0 ? "\u2022 " : "") + l, 330, nt, { size: 7.4, font: i === 0 ? ctx.bold : times });
      nt += 10;
    }
    nt += 2;
  });

  text(ctx, s.extra.network ?? "", 44, 740, { size: 6.6, font: times });
  text(ctx, s.extra.formCode ?? "", 380, 740, { size: 6.6, font: times, align: "right", width: 172 });
}

// ------------------------------------------------------------------ Fernourt

async function fernourt(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec, times: PDFFont, timesBold: PDFFont) {
  const W = 792;
  const maroon = "#5b1a32";
  box(ctx, 0, 0, W, 612, { fill: "#fbf9f4" });
  box(ctx, 26, 26, W - 52, 560, { border: maroon, borderWidth: 2.4 });
  box(ctx, 33, 33, W - 66, 546, { border: maroon, borderWidth: 0.8 });

  // corner ornaments
  for (const [cx, cy, dx, dy] of [
    [44, 44, 1, 1],
    [W - 44, 44, -1, 1],
    [44, 568, 1, -1],
    [W - 44, 568, -1, -1],
  ] as Array<[number, number, number, number]>) {
    line(ctx, cx, cy, cx + 46 * dx, 1.6, maroon);
    ctx.page.drawLine({
      start: { x: cx, y: ctx.H - cy },
      end: { x: cx, y: ctx.H - (cy + 46 * dy) },
      thickness: 1.6,
      color: hex(maroon),
    });
  }

  const spaced = (str: string) => clean(str).split("").join(" ");
  text(ctx, spaced(s.institution), 0, 86, { size: 20, font: ctx.bold, color: maroon, align: "center", width: W });
  line(ctx, 250, 118, 542, 0.8, maroon);
  text(ctx, s.extra.title ?? "GRADUATION DIPLOMA", 0, 132, {
    size: 30,
    font: timesBold,
    align: "center",
    width: W,
  });

  text(ctx, s.extra.awardedTo ?? "This Certificate is proudly awarded to:", 0, 190, {
    size: 12,
    font: times,
    align: "center",
    width: W,
  });
  text(ctx, s.studentName, 0, 216, { size: 26, font: ctx.boldItalic, color: maroon, align: "center", width: W });
  line(ctx, 246, 254, 546, 0.8, "#999999");

  const year = s.term || new Date().getFullYear().toString();
  const b1 = (s.extra.body1 ?? "has completed the necessary course of study for").replace("{{year}}", year);
  const b2 = (s.extra.body2 ?? "class of {{year}} high school graduation").replace("{{year}}", year);
  text(ctx, b1, 0, 272, { size: 13, font: times, align: "center", width: W });
  text(ctx, b2, 0, 294, { size: 13, font: times, align: "center", width: W });

  await image(ctx, pdf, fhsSeal.url, W / 2 - 52, 350, 104);

  await image(ctx, pdf, sigFhs1.url, 96, 396, 130);
  line(ctx, 80, 446, 280, 0.8);
  text(ctx, s.officialName, 80, 452, { size: 11, font: timesBold, align: "center", width: 200 });
  text(ctx, s.officialTitle, 80, 468, { size: 9.5, font: times, align: "center", width: 200 });

  await image(ctx, pdf, sigFhs2.url, 528, 396, 130);
  line(ctx, 512, 446, 712, 0.8);
  text(ctx, s.secondOfficialName, 512, 452, { size: 11, font: timesBold, align: "center", width: 200 });
  text(ctx, s.secondOfficialTitle, 512, 468, { size: 9.5, font: times, align: "center", width: 200 });
}

// ------------------------------------------------------------ University of Phoenix

async function phoenix(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec, times: PDFFont, timesBold: PDFFont) {
  const W = 612;
  const navy = "#1c4a63";
  await image(ctx, pdf, uopLogo.url, 421, 25, 169);
  let a = 72;
  for (const l of s.addressLines) {
    text(ctx, l, 476, a, { size: 8.2, font: times });
    a += 10.4;
  }

  const field = (l: string, v: string, top: number) => {
    text(ctx, l, 41, top, { size: 9, font: times });
    text(ctx, v, 111, top, { size: 9, font: times });
  };
  field("Date Issued:", s.issueDate, 71);
  field("Record of:", s.studentName, 82.6);
  field("Student Number:", s.studentId, 94.2);
  field("Birthdate:", s.extra.birthdate ?? "", 105.8);

  line(ctx, 40, 134, 581, 1.1);

  let st = 158;
  text(ctx, "SENT TO:", 188, st, { size: 9, font: times });
  st += 11.6;
  for (const l of s.studentAddress) {
    text(ctx, l, 188, st, { size: 9, font: times });
    st += 11.6;
  }

  line(ctx, 40, 236, 581, 1.1);
  text(ctx, "Prior Schools Attended", 41, 241, { size: 9, font: timesBold });
  text(ctx, "Credits", 430, 241, { size: 8.6, font: ctx.boldItalic, align: "center", width: 60 });
  text(ctx, "Degrees", 500, 241, { size: 8.6, font: ctx.boldItalic, align: "center", width: 60 });
  let pt = 262;
  for (const n of s.notes) {
    const [name, credits, degree] = n.split("|");
    text(ctx, name ?? "", 41, pt, { size: 9, font: times });
    text(ctx, credits ?? "", 430, pt, { size: 9, font: times, align: "center", width: 60 });
    text(ctx, degree ?? "", 500, pt, { size: 9, font: times, align: "center", width: 60 });
    pt += 11.6;
  }

  const headTop = Math.max(pt + 12, 340);
  line(ctx, 40, headTop - 8, 581, 1.1);
  const heads: Array<[string, string, number, number]> = [
    ["Mo/Year", "", 40, 46],
    ["Course ID", "", 85, 60],
    ["Course Title", "", 153, 120],
    ["Grade", "", 396, 34],
    ["Credits", "Attempted", 430, 52],
    ["Credits", "Earned", 484, 46],
    ["Quality", "Points", 524, 42],
    ["Rep", "", 556, 22],
  ];
  for (const [h1, h2, x, w] of heads) {
    text(ctx, h1, x, headTop, { size: 8.6, font: ctx.boldItalic, align: "center", width: w });
    if (h2) text(ctx, h2, x, headTop + 11, { size: 8.6, font: ctx.boldItalic, align: "center", width: w });
  }
  line(ctx, 40, headTop + 24, 581, 1.1);

  let t = headTop + 34;
  text(ctx, s.extra.schoolHeading ?? "", 41, t, { size: 9, font: timesBold });
  t += 15;
  for (const c of s.courses) {
    const [earned, quality] = (c.extra ?? "").split("|");
    text(ctx, c.code, 40, t, { size: 9, font: times, align: "center", width: 46 });
    text(ctx, c.num ?? "", 88, t, { size: 9, font: times });
    const titleLines = wrap(times, c.name, 9, 238);
    for (const [i, l] of titleLines.entries()) text(ctx, l, 153, t + i * 10.4, { size: 9, font: times });
    text(ctx, c.grade, 396, t, { size: 9, font: times, align: "center", width: 34 });
    text(ctx, c.credits ?? "", 430, t, { size: 9, font: times, align: "center", width: 52 });
    text(ctx, earned ?? "", 484, t, { size: 9, font: times, align: "center", width: 46 });
    text(ctx, quality ?? "", 524, t, { size: 9, font: times, align: "center", width: 42 });
    t += 10.4 * Math.max(1, titleLines.length) + 0.6;
  }

  text(ctx, s.extra.pageLabel ?? "", 480, 705, { size: 8.6, font: times, align: "right", width: 101 });

  box(ctx, 0, 718, W, 14, { fill: navy });
  text(ctx, s.extra.bannerLeft ?? "", 40, 721.5, { size: 7.6, font: ctx.bold, color: "#ffffff", align: "center", width: 340 });
  text(ctx, s.extra.bannerRight ?? "", 380, 721.5, { size: 7.6, font: ctx.bold, color: "#ffffff", align: "center", width: 200 });

  let ft = 738;
  for (const l of wrap(ctx.reg, s.extra.security ?? "", 6.2, 320)) {
    text(ctx, l, 40, ft, { size: 6.2 });
    ft += 8.4;
  }
  await image(ctx, pdf, uopSeal.url, 546, 736, 42);
  text(ctx, s.officialName, 380, 768, { size: 7.6, font: ctx.bold, align: "center", width: 150 });

  box(ctx, 0, 778, W, 14, { fill: navy });
  text(ctx, s.extra.bottomBanner ?? "", 0, 781, { size: 8, font: ctx.bold, color: "#ffffff", align: "center", width: W });
}

// -------------------------------------------------------------------- Queen's

async function queens(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec, times: PDFFont, timesBold: PDFFont) {
  const W = 792;
  await image(ctx, pdf, queensLogo.url, 25, 16, 68);

  let a = 34;
  for (const l of s.addressLines) {
    text(ctx, l, 101, a, { size: 8.2, font: timesBold });
    a += 10;
  }

  const field = (l: string, v: string, top: number) => {
    text(ctx, l, 243, top, { size: 8.2, font: ctx.bold });
    text(ctx, v, 299, top, { size: 8.2, font: ctx.bold });
  };
  field("Name:", s.studentName, 58);
  field("Student ID:", s.studentId, 69);
  field("OEN:", s.extra.oen ?? "", 80);
  text(ctx, s.extra.pageLabel ?? "", 620, 58, { size: 8.2, align: "right", width: 145 });

  const COLS = [
    { x: 52, code: 52, num: 90, desc: 126, units: 250, grade: 300, points: 348 },
    { x: 406, code: 406, num: 444, desc: 480, units: 604, grade: 654, points: 702 },
  ];
  const TOP = 118;
  const BOTTOM = 500;
  const LH = 10.2;
  let col = 0;
  let t = TOP;
  const nextCol = () => {
    col = Math.min(col + 1, 1);
    t = TOP;
    needHeader = true;
  };
  const advance = (n = 1) => {
    t += LH * n;
    if (t > BOTTOM && col === 0) nextCol();
  };

  const header = (c: (typeof COLS)[number]) => {
    const u = (label: string, x: number, w: number) => {
      text(ctx, label, x, t, { size: 8, align: "left", width: w });
      const wdt = ctx.reg.widthOfTextAtSize(label, 8);
      line(ctx, x, t + 9.4, x + wdt, 0.5);
    };
    u("Course", c.code, 40);
    u("Description", c.desc, 80);
    u("Units", c.units, 32);
    u("Grade", c.grade, 32);
    u("Points", c.points, 32);
    advance();
  };

  let needHeader = true;
  for (const row of s.courses) {
    const c = COLS[col];
    if (row.code === TERM_ROW) {
      advance();
      text(ctx, row.name, c.x, t, { size: 8.6, font: ctx.bold, align: "center", width: 300 });
      advance(2);
      needHeader = true;
      continue;
    }
    if (row.code === GPA_ROW) {
      const cc = COLS[col];
      text(ctx, "Units", cc.units, t, { size: 8 });
      text(ctx, "GPA Units", cc.grade - 8, t, { size: 8 });
      text(ctx, "Points", cc.points, t, { size: 8 });
      line(ctx, cc.units, t + 9.4, cc.points + 30, 0.5);
      advance();
      text(ctx, "Term GPA", cc.code + 8, t, { size: 8 });
      text(ctx, row.name, cc.desc - 20, t, { size: 8 });
      text(ctx, "Term Totals", cc.desc + 30, t, { size: 8 });
      text(ctx, row.credits ?? "", cc.units, t, { size: 8, align: "right", width: 34 });
      text(ctx, row.grade, cc.grade, t, { size: 8, align: "right", width: 40 });
      text(ctx, row.extra ?? "", cc.points, t, { size: 8, align: "right", width: 34 });
      advance();
      continue;
    }
    if (needHeader) {
      header(COLS[col]);
      needHeader = false;
    }
    const cc = COLS[col];
    text(ctx, row.code, cc.code, t, { size: 8 });
    text(ctx, row.num ?? "", cc.num, t, { size: 8 });
    text(ctx, row.name, cc.desc, t, { size: 8 });
    text(ctx, row.credits ?? "", cc.units, t, { size: 8, align: "right", width: 34 });
    text(ctx, row.grade, cc.grade, t, { size: 8, align: "center", width: 34 });
    text(ctx, row.extra ?? "", cc.points, t, { size: 8, align: "right", width: 34 });
    advance();
  }

  // career totals in the right column
  const c1 = COLS[1];
  let ct = Math.max(t + 18, TOP + 40);
  if (col === 0) ct = TOP + 40;
  text(ctx, s.extra.careerTotalsLabel ?? "", c1.code, ct, { size: 8.6, font: ctx.bold });
  ct += 16;
  const [u, gu, pts] = (s.extra.cumTotals ?? "").split("|");
  text(ctx, "Cum Totals", c1.desc + 30, ct, { size: 8 });
  text(ctx, u ?? "", c1.units, ct, { size: 8, align: "right", width: 34 });
  text(ctx, gu ?? "", c1.grade, ct, { size: 8, align: "right", width: 40 });
  text(ctx, pts ?? "", c1.points, ct, { size: 8, align: "right", width: 34 });
  ct += 20;
  text(ctx, s.extra.endLine ?? "", c1.x, ct, { size: 8.6, font: ctx.bold, align: "center", width: 300 });

  line(ctx, 25, 528, 767, 1.2);
  text(ctx, `Date Printed: ${s.printDate}`, 25, 532, { size: 7.6, font: ctx.bold });
  for (const [i, n] of s.notes.entries()) text(ctx, n, 25, 544 + i * 9, { size: 7.6 });
  text(ctx, s.extra.stamp ?? "", 25, 566, { size: 17, font: timesBold });
  text(ctx, s.officialTitle, 516, 532, { size: 7.4 });
  text(ctx, s.officialName, 516, 541, { size: 7.4 });
  await image(ctx, pdf, queensSig.url, 628, 526, 130);
}

// ------------------------------------------------------------------------ LSE

async function lse(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec, times: PDFFont, timesBold: PDFFont) {
  const W = 595;
  const M = 28;
  const banner = (top: number) => {
    text(ctx, s.extra.pageLabel ?? "", M, top, { size: 9, font: times });
    text(ctx, s.extra.banner ?? "", 0, top, { size: 9, font: times, align: "center", width: W });
    text(ctx, s.extra.pageLabel ?? "", W - M - 90, top, { size: 9, font: times, align: "right", width: 90 });
  };
  banner(12);
  banner(824);

  await image(ctx, pdf, lseLogo.url, 406, 39, 167);
  text(ctx, "ACADEMIC TRANSCRIPT", 0, 121, { size: 10.5, font: timesBold, align: "center", width: W });

  const pair = (l: string, v: string, x: number, vx: number, top: number) => {
    text(ctx, l, x, top, { size: 9.5, font: times });
    text(ctx, v, vx, top, { size: 9.5, font: timesBold });
  };
  pair("Name:", s.studentName, M, 94, 153);
  pair("Date of Birth:", s.extra.dob ?? "", M, 94, 166);
  pair("LSE ID No:", s.studentId, 215, 281, 166);
  pair("UK Higher Education ID No:", s.extra.ukHeId ?? "", 377, 520, 166);

  let t = 189;
  for (const l of wrap(times, s.extra.statement ?? "", 9.5, 538)) {
    text(ctx, l, M, t, { size: 9.5, font: times });
    t += 12;
  }

  t = 225;
  pair("Programme:", s.program, M, 108, t);
  t += 13;
  pair("Start Date:", s.startDate, M, 108, t);
  pair("Completion Date:", s.endDate, 380, 480, t);
  t += 13;
  text(ctx, "Language of", M, t, { size: 9.5, font: times });
  t += 13;
  pair("institution:", s.extra.language ?? "", M, 108, t);
  t += 22;
  pair("Award:", s.credential, M, 108, t);
  t += 13;
  pair("Awarding Body:", s.extra.awardingBody ?? "", M, 108, t);
  t += 13;
  pair("Class:", s.extra.class ?? "", M, 108, t);
  pair("Official Date of Award:", s.printDate, 355, 500, t);

  const head = 344;
  const cols: Array<[string, number, number, "left" | "center"]> = [
    ["Session", M, 44, "left"],
    ["Course", 72, 44, "left"],
    ["Title", 121, 200, "left"],
    ["Level", 428, 34, "center"],
    ["Value", 466, 34, "center"],
    ["Mark", 504, 34, "center"],
    ["Grade", 538, 34, "center"],
  ];
  for (const [l, x, w, al] of cols) text(ctx, l, x, head, { size: 9.5, font: times, align: al, width: w });
  line(ctx, M, head + 15, W - M, 0.8);

  let rt = head + 22;
  for (const c of s.courses) {
    const [level, letter] = (c.extra ?? "").split("|");
    text(ctx, c.code, M, rt, { size: 9.5, font: timesBold });
    text(ctx, c.num ?? "", 72, rt, { size: 9.5, font: timesBold });
    text(ctx, c.name, 121, rt, { size: 9.5, font: timesBold });
    text(ctx, level ?? "", 428, rt, { size: 9.5, font: timesBold, align: "center", width: 34 });
    text(ctx, c.credits ?? "", 466, rt, { size: 9.5, font: timesBold, align: "center", width: 34 });
    text(ctx, c.grade, 504, rt, { size: 9.5, font: timesBold, align: "center", width: 34 });
    text(ctx, letter ?? "", 538, rt, { size: 9.5, font: timesBold, align: "center", width: 34 });
    rt += 12.6;
  }

  await image(ctx, pdf, lseSig.url, M, 505, 100);
  await image(ctx, pdf, lseSeal.url, 412, 500, 92);
  text(ctx, s.officialName, M, 583, { size: 9.5, font: times });
  text(ctx, s.officialTitle, M, 596, { size: 9.5, font: times });
  text(ctx, `Issued and signed on:   ${s.issueDate}`, 340, 583, { size: 9.5, font: times, align: "right", width: 227 });
  text(ctx, "Page 1", 480, 812, { size: 7.6, font: times, align: "right", width: 87 });
}

// -------------------------------------------------------------------- Fleming

async function fleming(ctx: Ctx, pdf: PDFDocument, s: CredentialSpec) {
  const W = 612;
  const green = "#1f5c45";
  const M = 50;
  text(ctx, s.institution, M, 56, { size: 19, font: ctx.bold, color: green });
  line(ctx, M, 82, 190, 0.8, "#8fae9f");
  text(ctx, (s.extra.tagline ?? "LEARN  |  BELONG  |  BECOME").split("").join(" ").replace(/\s{3,}/g, "   "), M, 88, {
    size: 5.6,
    color: "#7c8c86",
  });
  text(ctx, s.extra.pageLabel ?? "", 440, 52, { size: 9, align: "right", width: 122 });

  text(ctx, s.extra.title ?? "Unofficial Transcript", 0, 124, { size: 10.5, font: ctx.bold, align: "center", width: W });

  const pair = (l: string, v: string, top: number, bold = false) => {
    text(ctx, l, M, top, { size: 9, font: bold ? ctx.bold : ctx.reg });
    text(ctx, v, 152, top, { size: 9, font: bold ? ctx.bold : ctx.reg });
  };
  pair("Name:", s.studentName, 138, true);
  pair("Student ID:", s.studentId, 150, true);

  text(ctx, "Student Address:", M, 170, { size: 9 });
  let at = 170;
  for (const l of s.studentAddress) {
    text(ctx, l, 152, at, { size: 9 });
    at += 12;
  }
  pair("Print Date:", s.printDate, at);

  text(ctx, "Degrees Awarded", 0, at + 24, { size: 9.5, align: "center", width: W });
  let dt = at + 46;
  pair("Degree:", s.credential, dt);
  dt += 12;
  pair("Confer Date:", s.endDate, dt);
  dt += 12;
  pair("Plan:", s.plan, dt);

  let t = dt + 28;
  text(ctx, "Beginning of Credit Record", 0, t, { size: 9.5, font: ctx.bold, align: "center", width: W });
  t += 26;

  const under = (label: string, x: number, top: number, align: "left" | "right" = "left", w = 0) => {
    text(ctx, label, x, top, { size: 9, align, width: w });
    const tw = ctx.reg.widthOfTextAtSize(label, 9);
    const sx = align === "right" ? x + w - tw : x;
    line(ctx, sx, top + 10.4, sx + tw, 0.5);
  };

  let needHeader = false;
  for (const row of s.courses) {
    if (row.code === TERM_ROW) {
      const [bold, rest] = [row.name.split(" (")[0], row.name.includes("(") ? ` (${row.name.split(" (")[1]}` : ""];
      const bw = ctx.bold.widthOfTextAtSize(clean(bold), 9.5);
      const rw = ctx.reg.widthOfTextAtSize(clean(rest), 9.5);
      const sx = (W - bw - rw) / 2;
      text(ctx, bold, sx, t, { size: 9.5, font: ctx.bold });
      text(ctx, rest, sx + bw, t, { size: 9.5 });
      t += 22;
      text(ctx, "Program:", M, t, { size: 9 });
      text(ctx, s.program, 152, t, { size: 9 });
      t += 18;
      needHeader = true;
      continue;
    }
    if (row.code === GPA_ROW) {
      t += 12;
      text(ctx, "Term GPA", M, t, { size: 9 });
      text(ctx, row.name, 178, t, { size: 9 });
      t += 26;
      continue;
    }
    if (needHeader) {
      under("Course", M, t);
      under("Description", 152, t);
      under("Earned", 420, t, "right", 60);
      under("Grade", 494, t, "right", 44);
      t += 14;
      needHeader = false;
    }
    text(ctx, row.code, M, t, { size: 9 });
    text(ctx, row.num ?? "", 105, t, { size: 9, align: "right", width: 26 });
    text(ctx, row.name, 152, t, { size: 9 });
    text(ctx, row.credits ?? "", 420, t, { size: 9, align: "right", width: 60 });
    text(ctx, row.grade, 494, t, { size: 9, align: "right", width: 44 });
    t += 12;
  }

  text(ctx, "Credit Career Totals", M, t, { size: 9, font: ctx.bold });
  t += 20;
  text(ctx, `${s.averageLabel}: ${s.average}   ${s.program}`, M, t, { size: 9 });
  t += 18;
  text(ctx, s.extra.endLine ?? "End of Unofficial Transcript", 0, t, {
    size: 15,
    font: ctx.bold,
    align: "center",
    width: W,
  });
}
