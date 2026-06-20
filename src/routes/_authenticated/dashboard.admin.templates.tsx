import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  AlertCircle,
  Loader2,
  FileText,
  ShieldOff,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  type Template,
  type MergeField,
  type FieldType,
  type TemplateLayout,
  DEFAULT_LAYOUT,
  extractMergeKeys,
} from "@/types/neptora";
import { extractPdfText } from "@/lib/pdf-text";
import { TemplateLayoutEditor } from "@/components/template-layout-editor";

export const Route = createFileRoute("/_authenticated/dashboard/admin/templates")({
  component: AdminTemplatesPage,
});

interface EditableTemplate {
  id?: string;
  name: string;
  description: string;
  category: string;
  body_template: string;
  merge_fields: MergeField[];
  layout: TemplateLayout;
  is_active: boolean;
}

const EMPTY: EditableTemplate = {
  name: "",
  description: "",
  category: "osap",
  body_template: "",
  merge_fields: [],
  layout: { ...DEFAULT_LAYOUT },
  is_active: true,
};

function AdminTemplatesPage() {
  const { data: isAdmin, isLoading: checkingRole } = useIsAdmin();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EditableTemplate | null>(null);
  const [editTab, setEditTab] = useState<"content" | "layout">("content");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (isAdmin) loadTemplates();
  }, [isAdmin]);

  const loadTemplates = async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("templates" as never)
      .select("*")
      .order("name");
    if (err) setError(err.message);
    else setTemplates((data as unknown as Template[]) || []);
    setLoading(false);
  };

  const syncMergeFields = (body: string, existing: MergeField[]): MergeField[] => {
    const keys = extractMergeKeys(body);
    const map = new Map(existing.map((f) => [f.key, f]));
    return keys.map(
      (k) =>
        map.get(k) ?? {
          key: k,
          label: k
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          type: "text" as FieldType,
          required: true,
        },
    );
  };

  const handleBodyChange = (body: string) => {
    if (!editing) return;
    setEditing({ ...editing, body_template: body, merge_fields: syncMergeFields(body, editing.merge_fields) });
  };

  const handleFieldChange = (idx: number, patch: Partial<MergeField>) => {
    if (!editing) return;
    const next = [...editing.merge_fields];
    next[idx] = { ...next[idx], ...patch };
    setEditing({ ...editing, merge_fields: next });
  };

  const handlePdfUpload = async (file: File) => {
    setExtracting(true);
    try {
      const text = await extractPdfText(file);
      if (!editing) return;
      setEditing({
        ...editing,
        body_template: text,
        merge_fields: syncMergeFields(text, editing.merge_fields),
      });
      toast.success("PDF text extracted. Now add {{variable}} markers in the body.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.body_template.trim()) {
      toast.error("Name and body are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: editing.name,
      description: editing.description || null,
      category: editing.category,
      body_template: editing.body_template,
      merge_fields: editing.merge_fields as unknown as object,
      layout: editing.layout as unknown as object,
      is_active: editing.is_active,
    };
    let err;
    if (editing.id) {
      const { error: e } = await supabase
        .from("templates" as never)
        .update(payload as never)
        .eq("id", editing.id);
      err = e;
    } else {
      const { error: e } = await supabase.from("templates" as never).insert(payload as never);
      err = e;
    }
    setSaving(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success(editing.id ? "Template updated" : "Template created");
    setEditing(null);
    loadTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this template? Existing affidavits keep their generated content.")) return;
    const { error: err } = await supabase.from("templates" as never).delete().eq("id", id);
    if (err) toast.error(err.message);
    else {
      toast.success("Template deleted");
      loadTemplates();
    }
  };

  if (checkingRole) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-lg p-12 text-center">
        <ShieldOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Authorized</h2>
        <p className="text-gray-600">You need administrator access to manage templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="section-heading mb-2">Template Library (Admin)</h1>
          <p className="text-gray-600">
            Manage the official affidavit templates. Use <code className="px-1 bg-gray-100 rounded">{`{{variable_name}}`}</code> in the body to mark merge fields.
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing({ ...EMPTY })} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {editing ? (
        <TemplateEditor
          value={editing}
          onChange={setEditing}
          onBodyChange={handleBodyChange}
          onFieldChange={handleFieldChange}
          onPdfUpload={handlePdfUpload}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
          extracting={extracting}
          initialTab={editTab}
          templates={templates}
          onApplyLayoutToAll={async (layout) => {
            const targets = templates.filter((t) => t.id !== editing.id);
            if (targets.length === 0) return;
            const results = await Promise.all(
              targets.map((t) =>
                supabase
                  .from("templates" as never)
                  .update({ layout: layout as unknown as object } as never)
                  .eq("id", t.id),
              ),
            );
            const failed = results.filter((r) => r.error);
            if (failed.length) {
              toast.error(`Failed to update ${failed.length} template(s)`);
            } else {
              toast.success(`Applied layout to ${targets.length} template(s)`);
              loadTemplates();
            }
          }}
        />



      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-6 flex gap-4">
              <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  {!t.is_active && (
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Inactive</span>
                  )}
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {t.merge_fields.length} fields
                  </span>
                </div>
                {t.description && <p className="text-sm text-gray-600 mt-1">{t.description}</p>}
              </div>
              <div className="flex items-start gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditTab("layout");
                    setEditing({
                      id: t.id,
                      name: t.name,
                      description: t.description || "",
                      category: t.category,
                      body_template: t.body_template,
                      merge_fields: t.merge_fields,
                      layout: { ...DEFAULT_LAYOUT, ...(t.layout ?? {}) } as TemplateLayout,
                      is_active: t.is_active,
                    });
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit PDF Layout"
                >
                  <LayoutTemplate className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditTab("content");
                    setEditing({
                      id: t.id,
                      name: t.name,
                      description: t.description || "",
                      category: t.category,
                      body_template: t.body_template,
                      merge_fields: t.merge_fields,
                      layout: { ...DEFAULT_LAYOUT, ...(t.layout ?? {}) } as TemplateLayout,
                      is_active: t.is_active,
                    });
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit Content"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  value,
  onChange,
  onBodyChange,
  onFieldChange,
  onPdfUpload,
  onSave,
  onCancel,
  saving,
  extracting,
  initialTab,
  templates,
  onApplyLayoutToAll,
}: {
  value: EditableTemplate;
  onChange: (v: EditableTemplate) => void;
  onBodyChange: (body: string) => void;
  onFieldChange: (idx: number, patch: Partial<MergeField>) => void;
  onPdfUpload: (file: File) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  extracting: boolean;
  initialTab?: "content" | "layout";
  templates: Template[];
  onApplyLayoutToAll?: (layout: TemplateLayout) => void | Promise<void>;
}) {
  const [tab, setTab] = useState<"content" | "layout">(initialTab ?? "content");

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{value.id ? "Edit Template" : "New Template"}</h2>
        <button onClick={onCancel} className="p-2 text-gray-600 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Name *</label>
          <input
            className="input-base"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Affidavit of Residence"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
          <input
            className="input-base"
            value={value.category}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
            placeholder="osap"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
          <input
            className="input-base"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
          />
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("content")}
          className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium ${tab === "content" ? "border-gold text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Content & Variables
        </button>
        <button
          type="button"
          onClick={() => setTab("layout")}
          className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium ${tab === "layout" ? "border-gold text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          PDF Layout
        </button>
      </div>

      {tab === "content" ? (
        <div className="space-y-6">
          <div className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <p className="font-medium text-gray-900">Import from PDF (optional)</p>
              <p>Extract text from a PDF, then add <code className="px-1 bg-gray-100 rounded">{`{{variables}}`}</code> manually.</p>
            </div>
            <label className="btn-secondary flex items-center gap-2 cursor-pointer">
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {extracting ? "Extracting..." : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={extracting}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPdfUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Template Body * <span className="text-gray-500">— use {`{{variable_name}}`} for merge fields</span>
            </label>
            <textarea
              className="input-base font-mono text-sm"
              rows={18}
              value={value.body_template}
              onChange={(e) => onBodyChange(e.target.value)}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Detected Merge Fields ({value.merge_fields.length})
            </h3>
            {value.merge_fields.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No {`{{variables}}`} detected yet. Add them in the body above.
              </p>
            ) : (
              <div className="space-y-2">
                {value.merge_fields.map((f, idx) => (
                  <div key={f.key} className="grid md:grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded">
                    <code className="md:col-span-3 text-xs bg-white border border-gray-200 rounded px-2 py-1 truncate">
                      {f.key}
                    </code>
                    <input
                      className="md:col-span-4 input-base !py-2"
                      value={f.label}
                      placeholder="Label"
                      onChange={(e) => onFieldChange(idx, { label: e.target.value })}
                    />
                    <select
                      className="md:col-span-3 input-base !py-2"
                      value={f.type}
                      onChange={(e) => onFieldChange(idx, { type: e.target.value as FieldType })}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="date">Date</option>
                      <option value="email">Email</option>
                      <option value="number">Number</option>
                    </select>
                    <label className="md:col-span-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => onFieldChange(idx, { required: e.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <TemplateLayoutEditor
          value={value.layout}
          onChange={(layout) => onChange({ ...value, layout })}
          templates={templates}
          currentTemplateId={value.id}
        />

      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.is_active}
          onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
        />
        Active (available to users)
      </label>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button onClick={onSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Template"}
        </button>
        <button onClick={onCancel} className="btn-secondary" disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
