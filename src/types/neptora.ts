export type FieldType = "text" | "textarea" | "email" | "date" | "select" | "number";

export interface MergeField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ElementPos {
  top: number;
  x?: number;
  size?: number;
  width?: number;
  height?: number;
  lh?: number;
}

export interface TemplateLayout {
  title: ElementPos;
  date: ElementPos;
  intro: ElementPos;
  facts: ElementPos;
  signatureLine: ElementPos;
  ackTitle: ElementPos;
  ackText: ElementPos;
  sworn: ElementPos;
  notaryImage: ElementPos;
}

export const PAGE_W = 612;
export const PAGE_H = 792;
export const MARGIN = 54;

export const DEFAULT_LAYOUT: TemplateLayout = {
  title: { top: 57.9, size: 14 },
  date: { top: 85, size: 10.5 },
  intro: { top: 105, size: 10.5, lh: 14 },
  facts: { top: 141, size: 10.5, lh: 14 },
  signatureLine: { top: 277.5 },
  ackTitle: { top: 491, size: 11 },
  ackText: { top: 508.7, size: 10, lh: 13 },
  sworn: { top: 683.5, x: 54, width: 234, size: 8.5, lh: 12 },
  notaryImage: { top: 601, x: 308, width: 248 },
};

export function withLayoutDefaults(partial?: Partial<TemplateLayout> | null): TemplateLayout {
  const p = partial ?? {};
  const out = {} as TemplateLayout;
  (Object.keys(DEFAULT_LAYOUT) as (keyof TemplateLayout)[]).forEach((k) => {
    out[k] = { ...DEFAULT_LAYOUT[k], ...(p[k] ?? {}) };
  });
  return out;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  body_template: string;
  merge_fields: MergeField[];
  layout?: Partial<TemplateLayout> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AffidavitStatus = "draft" | "generated" | "archived";

export interface Affidavit {
  id: string;
  user_id: string;
  template_id: string | null;
  template_name: string | null;
  client_name: string;
  matter_reference: string | null;
  form_data: Record<string, string>;
  generated_content: string;
  docx_path: string | null;
  pdf_path: string | null;
  status: AffidavitStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  firm_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Substitute {{key}} placeholders with values from form_data. */
export function renderTemplate(body: string, data: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (data[k] ?? "").toString());
}

/** Extract unique {{variable}} keys from a template body. */
export function extractMergeKeys(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    const key = m[1];
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** Sanitize a string for use in a filename. */
export function safeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "affidavit";
}

// ----- Date helpers (used by the renderer and the PDF generator) -----

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dayOrdinal(d: number): string {
  if (d >= 11 && d <= 13) return `${d}th`;
  switch (d % 10) {
    case 1: return `${d}st`;
    case 2: return `${d}nd`;
    case 3: return `${d}rd`;
    default: return `${d}th`;
  }
}

/** Parse a YYYY-MM-DD (or already-pretty) string into a Date or null. */
function parseDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** "April 16th, 2026" */
export function formatPrettyDate(v: string | undefined | null): string {
  const d = parseDate(v);
  if (!d) return (v ?? "").toString();
  return `${MONTHS[d.getMonth()]} ${dayOrdinal(d.getDate())}, ${d.getFullYear()}`;
}

/** "16th day of April 2026" */
export function formatDayOfMonth(v: string | undefined | null): string {
  const d = parseDate(v);
  if (!d) return (v ?? "").toString();
  return `${dayOrdinal(d.getDate())} day of ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ----- Affidavit structured model -----

export interface Deponent {
  name: string;
  dob?: string; // already formatted pretty
}

export interface AffidavitDoc {
  title: string;
  prettyDate: string;
  dayOfMonth: string;
  city: string;
  deponents: Deponent[];
  facts: string[];
  layout: TemplateLayout;
}

/** Build the structured affidavit doc from a template + form values. */
export function buildAffidavitDoc(
  template: Template,
  data: Record<string, string>,
): AffidavitDoc {
  const prettyDate = formatPrettyDate(data.affidavit_date);
  const dayOfMonth = formatDayOfMonth(data.affidavit_date);

  const d1: Deponent = {
    name: (data.deponent_1_name || "").trim(),
    dob: data.deponent_1_dob ? formatPrettyDate(data.deponent_1_dob) : undefined,
  };
  const deponents: Deponent[] = [d1];
  if (data.deponent_2_name) {
    deponents.push({
      name: (data.deponent_2_name || "").trim(),
      dob: data.deponent_2_dob ? formatPrettyDate(data.deponent_2_dob) : undefined,
    });
  }

  const body = renderTemplate(template.body_template, data);
  const facts = body
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    title: template.name.toUpperCase(),
    prettyDate,
    dayOfMonth,
    city: (data.city || "").trim(),
    deponents,
    facts,
    layout: withLayoutDefaults(template.layout),
  };
}

/** Plain-text rendering of the full affidavit (used as the saved DB record). */
export function renderAffidavitText(doc: AffidavitDoc): string {
  const lines: string[] = [];
  lines.push(doc.title);
  lines.push("");
  lines.push(doc.prettyDate);
  lines.push("");

  const intro = buildIntroSentence(doc);
  lines.push(intro);
  lines.push("");

  doc.facts.forEach((f, i) => {
    lines.push(`${i + 1}. ${f}`);
    lines.push("");
  });

  lines.push("");
  doc.deponents.forEach((d) => {
    lines.push("_________________________");
    lines.push(d.name);
    lines.push("");
  });

  lines.push("NOTARY ACKNOWLEDGEMENT");
  lines.push(buildNotarySentence(doc));
  lines.push("");
  lines.push(
    `Sworn/Declared Remotely from the City of ${doc.city} in the Province of Ontario before me in the city of Toronto in the Province of Ontario & Country of Canada This ${doc.dayOfMonth} in accordance with O. Reg 431/20 Administering Oath or Declaration Remotely Ontario.`,
  );
  lines.push("");
  lines.push("NOTARY PUBLIC — MARYANA IVANIVN DUBANOVYCH");
  lines.push("A Notary Public/Commissioner for Oaths in and for the Province of Ontario");
  lines.push("Expiry Date: September 8, 2026 — LSO Licence No. P14522");
  lines.push("");
  lines.push("Reliance Notary Public — 2711-25 Mabelle Avenue, Etobicoke, Ontario M9A 4Y1 Canada — 437-263-4264");

  return lines.join("\n");
}

export function buildIntroSentence(doc: AffidavitDoc): string {
  const parts: string[] = [];
  if (doc.deponents.length === 1) {
    const d = doc.deponents[0];
    parts.push(`I, ${d.name}`);
    if (d.dob) parts.push(`born on ${d.dob}`);
  } else {
    const segs = doc.deponents.map((d) => {
      return d.dob ? `${d.name}, born on ${d.dob}` : d.name;
    });
    parts.push(`We, ${segs.join(", and ")}`);
  }
  parts.push(`of the City of ${doc.city}`);
  parts.push("in the Province of Ontario");
  return parts.join(", ") + ", MAKE OATH AND SAY AS FOLLOWS:";
}

export function buildNotarySentence(doc: AffidavitDoc): string {
  const names =
    doc.deponents.length === 1
      ? doc.deponents[0].name
      : doc.deponents.slice(0, -1).map((d) => d.name).join(", ") +
        " and " + doc.deponents[doc.deponents.length - 1].name;
  const isAre = doc.deponents.length === 1 ? "is" : "are";
  return `This affidavit was acknowledged before me on this ${doc.dayOfMonth}, by ${names}, who ${isAre} personally known to me or have produced satisfactory evidence of identity.`;
}
