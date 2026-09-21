// Positional PDF parser for filled lender application forms.
// Supports: Journey Capital / White-Label "Business Financing Application",
// CanaCap "Business Information / Application", and QuickFlo AcroForm PDFs.
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";
import {
  parseQuickFloPdf,
  buildApplicationFromFieldMap,
} from "./lender-pdf-engine";
import type { BusinessFinancingApplication } from "@/types/financing";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export type LenderFormKind = "quickflo" | "journey" | "canacap" | "unknown";

interface PositionedItem {
  x: number;
  y: number;
  str: string;
}

async function extractItems(bytes: Uint8Array): Promise<{ items: PositionedItem[]; text: string }> {
  // pdf.js transfers (detaches) the buffer it is given — always hand it a copy
  // so the caller's original bytes stay usable for OCR / other parsers.
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const items: PositionedItem[] = [];
  for (const raw of content.items as Array<{ str: string; transform: number[] }>) {
    const str = (raw.str || "").trim();
    if (!str) continue;
    items.push({ x: raw.transform[4], y: raw.transform[5], str });
  }
  const text = items.map((i) => i.str).join(" ");
  return { items, text };
}

// Label fragments that belong to the blank template — never treat as a value.
const LABEL_RE =
  /^(mm\s*\/?\s*dd|yes|no|x|own|rent|lease|check if you|business|legal|city|province|postal|phone|fax|email|name|first|last|title|signature|print name|date|social insurance|% of ownership|years there|residence address|mobile|drivers? licen|from|to|start date|end date|provider|type of|if yes|owner\/officer)\b/i;

// Pre-printed date placeholder fragments ("mm", "/", "dd", "yyyy").
const PLACEHOLDER_RE = /^(\/|mm|dd|yyyy?|yyy|\/\s*(dd|yyyy?))$/i;

function valueAt(
  items: PositionedItem[],
  x: number,
  y: number,
  maxWidth = 120,
  allowLabelWords = false
): string {
  const row = items
    .filter(
      (it) =>
        Math.abs(it.y - y) <= 3 &&
        it.x >= x - 3 &&
        it.x <= x + maxWidth &&
        !PLACEHOLDER_RE.test(it.str) &&
        (allowLabelWords || !LABEL_RE.test(it.str)) &&
        !/:$/.test(it.str)
    )
    .sort((a, b) => a.x - b.x);
  if (!row.length) return "";
  // Stop at a large horizontal gap — that is the next form field.
  const parts: string[] = [row[0].str];
  let last = row[0];
  for (let i = 1; i < row.length; i++) {
    if (row[i].x - last.x > 60) break;
    parts.push(row[i].str);
    last = row[i];
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const joinLoc = (city: string, prov: string, postal: string) =>
  [city, prov, postal].filter(Boolean).join(", ");

const stripMoney = (v: string) => v.replace(/[^0-9.]/g, "");

export function detectLenderForm(text: string): LenderFormKind {
  const t = text.toLowerCase();
  if (t.includes("must choose one mailing address") || t.includes("non-card monthly sales")) {
    return "journey";
  }
  if (t.includes("canacap") || t.includes("circle one") || t.includes("gross annual sales")) {
    return "canacap";
  }
  return "unknown";
}

function journeyFieldMap(items: PositionedItem[]): Map<string, string> {
  const m = new Map<string, string>();
  const put = (k: string, v: string) => {
    if (v) m.set(k, v);
  };
  const at = (x: number, y: number, w?: number) => valueAt(items, x, y, w);

  put("qf_legalName", at(105, 668, 200));
  put("qf_phone", at(445, 668));
  put("qf_legal_street", at(90, 650, 250));
  put("qf_fax", at(445, 650));
  put(
    "qf_legal_city_prov_postal",
    joinLoc(at(55, 633, 150), at(265, 633, 100), at(465, 633, 100))
  );
  put("qf_dba", at(185, 615, 200));
  put("qf_address_street", at(180, 597, 250));
  put(
    "qf_address_city_prov_postal",
    joinLoc(at(55, 580, 150), at(265, 580, 100), at(465, 580, 100))
  );
  put("qf_email", at(410, 561, 170));
  put("qf_sin", at(195, 529, 120));
  put("qf_incorpProv", at(450, 529, 60));
  put("qf_numLocations", at(565, 529, 40));
  put("qf_dateStarted", at(30, 502, 60));
  put("qf_productSold", at(255, 502, 180));
  put("qf_amountRequested", stripMoney(at(510, 502, 90)));
  put("qf_useOfFunds", at(125, 495, 250));
  put("qf_prop_leaseStart", at(53, 458, 60));
  put("qf_prop_leaseEnd", at(163, 458, 60));
  put("qf_nonCardSales", stripMoney(at(125, 432, 120)));
  put("qf_grossMonthlySales", stripMoney(at(415, 432, 120)));
  put("qf_cashAdvanceProvider", at(245, 407, 150));
  put("qf_taxId", at(140, 384, 150));
  put("qf_rent", stripMoney(at(440, 384, 120)));
  const franName = at(130, 362, 200);
  const franPhone = at(455, 362, 100);
  if (franName || franPhone) put("qf_franchisorInfo", `${franName} • ${franPhone}`);

  const owner = (idx: 1 | 2, rows: number[]) => {
    const [yName, yId, yOwn, yAddr, yContact] = rows;
    const p = `qf_p${idx}_`;
    const first = at(75, yName, 180);
    const last = at(280, yName, 150);
    const full = [first, last].filter(Boolean).join(" ");
    put(`${p}name`, full);
    put(`${p}title`, at(445, yName, 130));
    put(`${p}sin`, at(125, yId, 130));
    put(`${p}dob`, at(272, yId, 70));
    put(`${p}dl`, at(450, yId, 130));
    put(`${p}ownership`, at(95, yOwn, 60).replace(/[^0-9.]/g, ""));
    put(`${p}yearsAtRes`, at(285, yOwn, 60).replace(/[^0-9.]/g, ""));
    put(`${p}street`, at(105, yAddr, 140));
    put(
      `${p}city_prov_postal`,
      joinLoc(at(255, yAddr, 140), at(405, yAddr, 130), at(550, yAddr, 60))
    );
    put(`${p}phone`, at(65, yContact, 180));
    put(`${p}mobile`, at(265, yContact, 120));
    put(`${p}email`, at(395, yContact, 200));
  };
  owner(1, [320, 303, 285, 268, 251]);
  owner(2, [221, 203, 186, 169, 151]);

  put("qf_sig1_title", at(220, 73, 170));
  put("qf_sig1_name", at(405, 73, 120));
  put("qf_sig1_date", at(540, 73, 60));
  put("qf_sig2_title", at(220, 36, 170));
  put("qf_sig2_name", at(405, 36, 120));
  put("qf_sig2_date", at(540, 36, 60));

  return m;
}

function canacapFieldMap(items: PositionedItem[]): Map<string, string> {
  const m = new Map<string, string>();
  const put = (k: string, v: string) => {
    if (v) m.set(k, v);
  };
  const at = (x: number, y: number, w?: number) => valueAt(items, x, y, w);

  put("qf_legalName", at(135, 693, 190));
  put("qf_dba", at(345, 693, 200));
  put("qf_address_street", at(115, 677, 250));
  put(
    "qf_address_city_prov_postal",
    joinLoc(at(65, 661, 150), at(235, 661, 140), at(395, 661, 120))
  );
  put("qf_dateStarted", at(135, 646, 130));
  put("qf_grossAnnualSales", stripMoney(at(435, 646, 120)));
  put("qf_phone", at(75, 630, 100));
  put("qf_fax", at(185, 630, 100));
  put("qf_website", at(305, 630, 80));
  put("qf_email", at(390, 630, 180));
  put("qf_taxId", at(65, 614, 120));
  put("qf_productSold", at(125, 584, 240));
  put("qf_useOfFunds", at(385, 584, 200));

  const owner = (idx: 1 | 2, rows: number[]) => {
    const [yName, yAddr, yId] = rows;
    const p = `qf_p${idx}_`;
    put(`${p}name`, at(125, yName, 190));
    put(`${p}title`, at(330, yName, 140));
    put(`${p}ownership`, at(485, yName, 60).replace(/[^0-9.]/g, ""));
    put(`${p}street`, at(105, yAddr, 160));
    put(
      `${p}city_prov_postal`,
      joinLoc(at(280, yAddr, 110), at(405, yAddr, 90), at(505, yAddr, 70))
    );
    put(`${p}sin`, at(70, yId, 110));
    put(`${p}dob`, at(195, yId, 70));
    put(`${p}phone`, at(310, yId, 80));
    put(`${p}mobile`, at(400, yId, 80));
  };
  owner(1, [545, 529, 513]);
  owner(2, [482, 466, 451]);

  put("qf_prop_landlord", at(215, 410, 250));
  put("qf_prop_account", at(485, 410, 100));
  put("qf_prop_contact", at(105, 394, 220));
  put("qf_prop_phone", at(345, 394, 200));
  put("qf_prop_occupancy", valueAt(items, 105, 379, 120, true));
  put("qf_prop_rent", stripMoney(at(365, 379, 150)));

  put("qf_ref1_name", at(105, 344, 200));
  put("qf_ref1_account", at(325, 344, 90));
  put("qf_ref2_name", at(105, 328, 200));
  put("qf_ref2_account", at(325, 328, 90));

  put("qf_pp_terminalModel", at(225, 294, 250));
  put("qf_pp_numTerminals", at(515, 294, 60));
  put("qf_pp_monthlyVol", stripMoney(at(505, 278, 90)));

  put("qf_sig1_name", at(60, 96, 200));
  put("qf_sig1_date", at(60, 65, 70));
  put("qf_sig2_name", at(350, 96, 200));
  put("qf_sig2_date", at(350, 65, 70));

  return m;
}

/**
 * Parses any supported lender application PDF into an application object.
 * Tries the QuickFlo AcroForm first, then falls back to positional text
 * extraction for Journey Capital / White-Label and CanaCap forms.
 */
export async function parseLenderPdf(
  fileBytes: ArrayBuffer | Uint8Array
): Promise<{ app: BusinessFinancingApplication; kind: LenderFormKind }> {
  const bytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);

  // 1. AcroForm path (QuickFlo fillable intake)
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fields = doc.getForm().getFields();
    const hasQf = fields.some((f) => f.getName().startsWith("qf_"));
    if (hasQf) {
      const filled = fields.some((f) => {
        try {
          const g = (f as any).getText?.();
          return typeof g === "string" && g.trim().length > 0;
        } catch {
          return false;
        }
      });
      if (filled) {
        const app = await parseQuickFloPdf(bytes);
        return { app, kind: "quickflo" };
      }
    }
  } catch {
    // fall through to text extraction
  }

  // 2. Positional text extraction
  const { items, text } = await extractItems(bytes);
  const kind = detectLenderForm(text);
  const map =
    kind === "canacap" ? canacapFieldMap(items) : journeyFieldMap(items);

  if (map.size === 0) {
    throw new Error(
      "Could not read this PDF. Upload a filled QuickFlo, Journey Capital, or CanaCap application."
    );
  }

  const app = await buildApplicationFromFieldMap(map);
  return { app, kind: kind === "unknown" ? "journey" : kind };
}

/**
 * True when a PDF page carries no machine-readable text (a scan / photo).
 * Such uploads need OCR instead of positional extraction.
 */
export async function isScannedPdf(fileBytes: ArrayBuffer | Uint8Array): Promise<boolean> {
  const bytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);
  try {
    const { text } = await extractItems(bytes);
    return text.replace(/\s/g, "").length < 40;
  } catch {
    return true;
  }
}

/** Build an application from a flat qf_* field map (used by the OCR path). */
export async function buildApplicationFromFields(
  fields: Record<string, string>
): Promise<BusinessFinancingApplication> {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(fields)) {
    if (v) map.set(k, v);
  }
  return buildApplicationFromFieldMap(map);
}
