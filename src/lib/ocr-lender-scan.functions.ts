import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Reads a scanned (image-only / handwritten) lender application PDF using an
// AI vision model and returns a flat qf_* field map that the existing
// application builder understands.

const InputSchema = z.object({
  fileBase64: z.string().min(100),
  fileName: z.string().optional(),
});

const FIELD_KEYS = [
  "qf_legalName",
  "qf_dba",
  "qf_phone",
  "qf_fax",
  "qf_email",
  "qf_website",
  "qf_legal_street",
  "qf_legal_city_prov_postal",
  "qf_address_street",
  "qf_address_city_prov_postal",
  "qf_mailing_choice",
  "qf_sin",
  "qf_incorpProv",
  "qf_numLocations",
  "qf_dateStarted",
  "qf_ownership_length",
  "qf_productSold",
  "qf_amountRequested",
  "qf_useOfFunds",
  "qf_entityType",
  "qf_taxId",
  "qf_isSeasonal",
  "qf_isFranchise",
  "qf_franchisorInfo",
  "qf_peakMonths",
  "qf_nonCardSales",
  "qf_grossMonthlySales",
  "qf_grossAnnualSales",
  "qf_mca_receivedBefore",
  "qf_mca_provider",
  "qf_mca_when",
  "qf_rent",
  "qf_prop_leaseStart",
  "qf_prop_leaseEnd",
  "qf_prop_occupancy",
  "qf_prop_landlord",
  "qf_prop_phone",
  "qf_p1_name",
  "qf_p1_title",
  "qf_p1_sin",
  "qf_p1_dob",
  "qf_p1_dl",
  "qf_p1_ownership",
  "qf_p1_yearsAtRes",
  "qf_p1_housing",
  "qf_p1_street",
  "qf_p1_city_prov_postal",
  "qf_p1_phone",
  "qf_p1_mobile",
  "qf_p1_email",
  "qf_p2_name",
  "qf_p2_title",
  "qf_p2_sin",
  "qf_p2_dob",
  "qf_p2_dl",
  "qf_p2_ownership",
  "qf_p2_yearsAtRes",
  "qf_p2_housing",
  "qf_p2_street",
  "qf_p2_city_prov_postal",
  "qf_p2_phone",
  "qf_p2_mobile",
  "qf_p2_email",
  "qf_sig1_name",
  "qf_sig1_title",
  "qf_sig1_date",
  "qf_sig2_name",
  "qf_sig2_title",
  "qf_sig2_date",
] as const;

const PROMPT = `You are reading a scanned Canadian business financing application form (Journey Capital / CanaCap / QuickFlo style). It may be handwritten.

Transcribe every filled-in value exactly as written. Return ONLY a JSON object whose keys come from this list (omit any key that is blank on the form):
${FIELD_KEYS.join(", ")}

Rules:
- Never invent values. If a field is blank or says N/A, omit the key.
- Addresses: "*_street" is the street line only; "*_city_prov_postal" is "City, Province, PostalCode".
- Money fields (qf_amountRequested, qf_grossMonthlySales, qf_nonCardSales, qf_rent, qf_grossAnnualSales): digits only, no $ or commas.
- Dates: MM/DD/YYYY.
- qf_entityType: one of sole proprietor, partnership, limited partnership, llc, llp, corporation (whichever is checked).
- qf_prop_occupancy: own, rent, or lease (whichever is checked for the business/owner).
- qf_mca_receivedBefore, qf_isSeasonal, qf_isFranchise: "Yes" or "No".
- qf_p1_name / qf_p2_name: full name "First Last".
- qf_ownership_length: e.g. "2 years".
Output raw JSON, no markdown fences.`;

export const ocrLenderScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("AI reading is not configured for this project.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: PROMPT },
              {
                type: "input_file",
                filename: data.fileName || "application.pdf",
                file_data: `data:application/pdf;base64,${data.fileBase64}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) {
        throw new Error("Too many requests right now. Please try again in a moment.");
      }
      if (response.status === 402 || response.status === 403) {
        throw new Error("AI reading is unavailable: workspace AI credits or access are blocked.");
      }
      console.error("AI gateway error", response.status, body);
      throw new Error("Could not read this scanned application.");
    }

    const json: any = await response.json();
    let text: string =
      json.output_text ??
      (Array.isArray(json.output)
        ? json.output
            .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
            .map((c: any) => c?.text || "")
            .join("")
        : "");

    text = String(text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("No readable information was found on this scan.");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("No readable information was found on this scan.");
    }

    const fields: Record<string, string> = {};
    for (const key of FIELD_KEYS) {
      const value = parsed[key];
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (!str || /^n\/?a$/i.test(str)) continue;
      fields[key] = str;
    }

    return { fields };
  });
