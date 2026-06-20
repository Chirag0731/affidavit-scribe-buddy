export type FieldType = "text" | "textarea" | "email" | "date" | "select" | "number";

export interface MergeField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  body_template: string;
  merge_fields: MergeField[];
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
