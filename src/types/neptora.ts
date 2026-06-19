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

/** Trigger a .txt download in the browser. */
export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
