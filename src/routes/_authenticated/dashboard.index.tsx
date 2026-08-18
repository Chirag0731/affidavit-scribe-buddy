import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  ArrowLeft,
  Save,
  SlidersHorizontal,
  Pencil,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type Template,
  type MergeField,
  type TemplateLayout,
  type AffidavitDoc,
  type SignaturePlacement,
  type Affidavit,
  withLayoutDefaults,
  buildAffidavitDoc,
  renderAffidavitText,
  safeFilename,
} from "@/types/neptora";
import { generateDocx, generatePdf } from "@/lib/doc-generator";
import { uploadAffidavitFile, downloadStorageFile } from "@/lib/storage";
import { TemplateLayoutEditor } from "@/components/template-layout-editor";
import { PdfHtmlPreview } from "@/components/pdf-html-preview";
import { SignaturePanel } from "@/components/signature-panel";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  component: NewAffidavitPage,
  ssr: false,
});

interface DraftData {
  templateId: string;
  clientName: string;
  matterReference: string;
  formData: Record<string, string>;
  signatures?: SignaturePlacement[];
  savedAt: number;
}

const DRAFT_PREFIX = "neptora_draft_";
const LAST_DRAFT_KEY = "neptora_last_active_template";

function getSavedDraft(templateId: string): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + templateId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraftToStorage(
  templateId: string,
  clientName: string,
  matterReference: string,
  formData: Record<string, string>,
  signatures: SignaturePlacement[],
) {
  try {
    const draft: DraftData = {
      templateId,
      clientName,
      matterReference,
      formData,
      signatures,
      savedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_PREFIX + templateId, JSON.stringify(draft));
    localStorage.setItem(LAST_DRAFT_KEY, templateId);
  } catch {
    /* ignore storage quota / disabled */
  }
}

function clearSavedDraft(templateId: string) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + templateId);
    if (localStorage.getItem(LAST_DRAFT_KEY) === templateId) {
      localStorage.removeItem(LAST_DRAFT_KEY);
    }
  } catch {
    /* ignore */
  }
}

type Step = "template-selection" | "form-fill" | "preview";

function NewAffidavitPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const editId = search.edit;

  const [step, setStep] = useState<Step>("template-selection");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [clientName, setClientName] = useState("");
  const [matterReference, setMatterReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [docxPath, setDocxPath] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [affidavitId, setAffidavitId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [affidavitDoc, setAffidavitDoc] = useState<AffidavitDoc | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<TemplateLayout | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [signatures, setSignatures] = useState<SignaturePlacement[]>([]);
  const [savingLayout, setSavingLayout] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editId) {
      loadAffidavitForEdit(editId);
    } else {
      fetchTemplates();
    }
  }, [editId]);

  const loadAffidavitForEdit = async (id: string) => {
    try {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase
        .from("affidavits" as never)
        .select("*")
        .eq("id", id)
        .single();
      if (err) throw err;
      const aff = data as unknown as Affidavit;
      if (!aff) throw new Error("Affidavit not found");

      let currentTemplates = templates;
      if (currentTemplates.length === 0) {
        const { data: tpls } = await supabase
          .from("templates" as never)
          .select("*")
          .eq("is_active", true)
          .order("name");
        currentTemplates = (tpls as unknown as Template[]) || [];
        setTemplates(currentTemplates);
      }

      let tpl = currentTemplates.find((t) => t.id === aff.template_id);
      if (!tpl && aff.template_name) {
        tpl = currentTemplates.find((t) => t.name === aff.template_name);
      }
      if (!tpl && aff.template_id) {
        const { data: tplData } = await supabase
          .from("templates" as never)
          .select("*")
          .eq("id", aff.template_id)
          .maybeSingle();
        if (tplData) tpl = tplData as unknown as Template;
      }

      if (tpl) {
        setSelectedTemplate(tpl);
      }
      setAffidavitId(aff.id);
      setClientName(aff.client_name || "");
      setMatterReference(aff.matter_reference || "");
      setFormData((aff.form_data as Record<string, string>) || {});
      setGeneratedContent(aff.generated_content || "");
      setDocxPath(aff.docx_path || null);
      setPdfPath(aff.pdf_path || null);
      if ((aff as any).signatures && Array.isArray((aff as any).signatures)) {
        setSignatures((aff as any).signatures);
      }
      setStep("form-fill");
      toast.info(`Loaded affidavit for "${aff.client_name}" to edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load affidavit for editing");
    } finally {
      setLoading(false);
    }
  };

  // Auto-save draft whenever inputs change on form-fill or preview step (only for unsaved new affidavits)
  useEffect(() => {
    if (!selectedTemplate || step === "template-selection" || affidavitId) return;
    const hasContent =
      clientName.trim() ||
      matterReference.trim() ||
      Object.values(formData).some((v) => (v ?? "").toString().trim().length > 0) ||
      signatures.length > 0;
    if (hasContent) {
      saveDraftToStorage(selectedTemplate.id, clientName, matterReference, formData, signatures);
    }
  }, [clientName, matterReference, formData, signatures, selectedTemplate, step, affidavitId]);

  // Live re-render of the PDF preview while adjusting the layout
  useEffect(() => {
    if (step !== "preview" || !selectedTemplate || !layoutDraft) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      try {
        const affDoc = buildAffidavitDoc(
          { ...selectedTemplate, layout: layoutDraft },
          formData,
          signatures,
        );
        setAffidavitDoc(affDoc);
        const blob = await generatePdf(affDoc);
        setPdfUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      } catch {
        /* ignore preview errors */
      }
    }, 350);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutDraft, signatures, step]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase
        .from("templates" as never)
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (err) throw err;
      const tpls = (data as unknown as Template[]) || [];
      setTemplates(tpls);

      // Check if there was an active draft from previous session
      const lastTemplateId = localStorage.getItem(LAST_DRAFT_KEY);
      if (lastTemplateId && tpls.length > 0 && !editId) {
        const found = tpls.find((t) => t.id === lastTemplateId);
        const draft = getSavedDraft(lastTemplateId);
        if (found && draft) {
          setSelectedTemplate(found);
          setClientName(draft.clientName || "");
          setMatterReference(draft.matterReference || "");
          setFormData(draft.formData || {});
          setSignatures(draft.signatures || []);
          setStep("form-fill");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setAffidavitId(null);
    setError("");
    const draft = getSavedDraft(template.id);
    if (draft && (draft.clientName || Object.keys(draft.formData || {}).length > 0)) {
      setClientName(draft.clientName || "");
      setMatterReference(draft.matterReference || "");
      setFormData(draft.formData || {});
      setSignatures(draft.signatures || []);
      toast.info("Restored your previously entered information for this template");
    } else {
      setFormData({});
      setClientName("");
      setMatterReference("");
      setSignatures([]);
    }
    setStep("form-fill");
  };

  const handleClearForm = () => {
    if (!window.confirm("Clear all entered fields for this template?")) return;
    if (selectedTemplate) {
      clearSavedDraft(selectedTemplate.id);
    }
    setFormData({});
    setClientName("");
    setMatterReference("");
    setSignatures([]);
    toast.success("Form cleared");
  };

  const handleFormChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    const missing = selectedTemplate.merge_fields
      .filter((f) => f.required)
      .filter((f) => !formData[f.key]?.toString().trim());
    if (missing.length > 0) {
      setError(`Please fill in required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    if (!clientName.trim()) {
      setError("Client name is required");
      return;
    }

    setError("");
    setGenerating(true);
    try {
      const affDoc = buildAffidavitDoc(selectedTemplate, formData, signatures);
      setAffidavitDoc(affDoc);
      const content = renderAffidavitText(affDoc);
      setGeneratedContent(content);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate DOCX + PDF and upload to Cloud Storage
      const base = `${safeFilename(clientName)}-${Date.now()}`;
      const [docxBlob, pdfBlob] = await Promise.all([
        generateDocx(affDoc),
        generatePdf(affDoc),
      ]);
      const [uploadedDocx, uploadedPdf] = await Promise.all([
        uploadAffidavitFile(user.id, `${base}.docx`, docxBlob),
        uploadAffidavitFile(user.id, `${base}.pdf`, pdfBlob),
      ]);
      setDocxPath(uploadedDocx);
      setPdfPath(uploadedPdf);
      setPdfUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(pdfBlob);
      });
      setLayoutDraft(withLayoutDefaults(selectedTemplate.layout));

      if (affidavitId) {
        // UPDATE existing affidavit
        const { error: updateErr } = await supabase
          .from("affidavits" as never)
          .update({
            template_id: selectedTemplate.id,
            template_name: selectedTemplate.name,
            client_name: clientName,
            matter_reference: matterReference || null,
            form_data: formData,
            signatures: signatures as unknown as object,
            generated_content: content,
            docx_path: uploadedDocx,
            pdf_path: uploadedPdf,
            status: "generated",
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", affidavitId);
        if (updateErr) throw updateErr;
        toast.success("Affidavit updated and files re-generated");
      } else {
        // INSERT new affidavit
        const { data: inserted, error: insertErr } = await supabase
          .from("affidavits" as never)
          .insert({
            user_id: user.id,
            template_id: selectedTemplate.id,
            template_name: selectedTemplate.name,
            client_name: clientName,
            matter_reference: matterReference || null,
            form_data: formData,
            signatures: signatures as unknown as object,
            generated_content: content,
            docx_path: uploadedDocx,
            pdf_path: uploadedPdf,
            status: "generated",
          } as never)
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        setAffidavitId((inserted as unknown as { id: string })?.id ?? null);
        toast.success("Affidavit generated and saved");
      }

      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate affidavit");
    } finally {
      setGenerating(false);
    }
  };

  /** Persist the adjusted layout to the template and re-render the stored files. */
  const handleSaveLayout = async () => {
    if (!selectedTemplate || !layoutDraft) return;
    setSavingLayout(true);
    try {
      const { error: upErr } = await supabase
        .from("templates" as never)
        .update({ layout: layoutDraft } as never)
        .eq("id", selectedTemplate.id);
      if (upErr) throw upErr;

      const updatedTemplate = { ...selectedTemplate, layout: layoutDraft };
      setSelectedTemplate(updatedTemplate);
      setTemplates((prev) =>
        prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t)),
      );

      const affDoc = buildAffidavitDoc(updatedTemplate, formData, signatures);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [docxBlob, pdfBlob] = await Promise.all([
        generateDocx(affDoc),
        generatePdf(affDoc),
      ]);
      const base = `${safeFilename(clientName)}-${Date.now()}`;
      const [uploadedDocx, uploadedPdf] = await Promise.all([
        uploadAffidavitFile(user.id, `${base}.docx`, docxBlob),
        uploadAffidavitFile(user.id, `${base}.pdf`, pdfBlob),
      ]);
      setDocxPath(uploadedDocx);
      setPdfPath(uploadedPdf);

      if (affidavitId) {
        await supabase
          .from("affidavits" as never)
          .update({ docx_path: uploadedDocx, pdf_path: uploadedPdf } as never)
          .eq("id", affidavitId);
      }
      toast.success("Layout saved to template and documents updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save layout");
    } finally {
      setSavingLayout(false);
    }
  };

  const handleReset = () => {
    if (selectedTemplate) {
      clearSavedDraft(selectedTemplate.id);
    }
    navigate({ to: "/dashboard", search: {} });
    setStep("template-selection");
    setSelectedTemplate(null);
    setFormData({});
    setClientName("");
    setMatterReference("");
    setError("");
    setGeneratedContent("");
    setDocxPath(null);
    setPdfPath(null);
    setAffidavitId(null);
    setAffidavitDoc(null);
    setLayoutDraft(null);
    setShowEditor(false);
    setSignatures([]);
    setPdfUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  };


  if (step === "template-selection") {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-heading mb-2">New Affidavit</h1>
            <p className="text-muted-foreground">Select a legal template to generate an affidavit or manage student OSAP files.</p>
          </div>
          <Link
            to="/dashboard/osap"
            className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto shadow-sm"
          >
            <Shield className="w-4 h-4" /> Switch to OSAP Management
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="border border-border rounded-lg p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Templates Available</h3>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="text-left border border-border rounded-lg p-6 hover:shadow-md hover:border-gold transition-smooth group bg-card"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gold" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-smooth" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                )}
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  {template.merge_fields.length} fields
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "form-fill" && selectedTemplate) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => {
                if (affidavitId) {
                  navigate({ to: "/dashboard/saved" });
                } else {
                  setStep("template-selection");
                }
              }}
              className="flex items-center gap-2 text-gold hover:text-gold-dark transition-smooth font-medium mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> {affidavitId ? "Back to Saved Affidavits" : "Back to Templates"}
            </button>
            <h1 className="section-heading mb-2">{selectedTemplate.name}</h1>
            <p className="text-muted-foreground">
              Fill in the information below. The legal wording is fixed — only these variables are
              replaced.
            </p>
          </div>
          {affidavitId ? (
            <div className="flex items-center gap-1.5 text-xs text-gold bg-gold/15 border border-gold/30 px-3 py-1.5 rounded-full font-medium mt-2">
              <Pencil className="w-3.5 h-3.5" />
              <span>Editing Saved Affidavit</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-full mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Autosaving inputs</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="bg-card border border-border rounded-lg p-8 space-y-8"
        >
          <div>
            <h3 className="font-semibold text-foreground mb-4 pb-3 border-b border-border">
              Basic Information
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Full name (used for the saved file name)"
                  required
                  className="input-base"
                  disabled={generating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Matter Reference
                </label>
                <input
                  type="text"
                  value={matterReference}
                  onChange={(e) => setMatterReference(e.target.value)}
                  placeholder="e.g., OSAP 2026"
                  className="input-base"
                  disabled={generating}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4 pb-3 border-b border-border">
              Merge Variables
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {selectedTemplate.merge_fields.map((field: MergeField) => (
                <div
                  key={field.key}
                  className={field.type === "textarea" ? "md:col-span-2" : ""}
                >
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {field.label}
                    {field.required && " *"}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFormChange(field.key, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      rows={4}
                      className="input-base"
                      disabled={generating}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFormChange(field.key, e.target.value)}
                      required={field.required}
                      className="input-base"
                      disabled={generating}
                    >
                      <option value="">Select an option</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFormChange(field.key, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="input-base"
                      disabled={generating}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              {generating
                ? (affidavitId ? "Updating DOCX & PDF..." : "Generating DOCX & PDF...")
                : (affidavitId ? "Save & Update Affidavit" : "Generate Affidavit")}
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              className="btn-secondary"
              disabled={generating}
            >
              Clear Form
            </button>
            <button
              type="button"
              onClick={() => {
                if (affidavitId) {
                  navigate({ to: "/dashboard/saved" });
                } else {
                  setStep("template-selection");
                }
              }}
              className="btn-secondary"
              disabled={generating}
            >
              {affidavitId ? "Cancel Edit" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // preview
  const baseName = safeFilename(clientName) || "affidavit";
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-800 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-green-400">Affidavit saved</h3>
          <p className="text-sm text-green-400">
            Your DOCX and PDF have been generated and stored securely.
          </p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="section-heading mb-2">Preview</h1>
          <p className="text-muted-foreground">
            Review the PDF exactly as it will download, and adjust positioning before saving.
          </p>
        </div>
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="btn-secondary flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showEditor ? "Hide layout editor" : "Adjust layout"}
        </button>
      </div>

      <div className={showEditor ? "grid lg:grid-cols-2 gap-6 items-start" : ""}>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {affidavitDoc ? (
            <PdfHtmlPreview
              doc={affidavitDoc}
              className="w-full h-[900px]"
              onSignaturesChange={setSignatures}
            />
          ) : (
            <div className="p-8 text-muted-foreground">Preparing preview…</div>
          )}
        </div>

        <div className="space-y-6">
          {affidavitDoc && (
            <div className="bg-card border border-border rounded-lg p-4">
              <SignaturePanel
                deponents={affidavitDoc.deponents}
                layout={layoutDraft ?? affidavitDoc.layout}
                signatures={signatures}
                onChange={setSignatures}
              />
              <button
                onClick={handleSaveLayout}
                disabled={savingLayout}
                className="btn-primary flex items-center gap-2 mt-4"
              >
                {savingLayout ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Update documents
              </button>
            </div>
          )}

          {showEditor && layoutDraft && (
            <div className="space-y-4">
              <TemplateLayoutEditor
                value={layoutDraft}
                onChange={setLayoutDraft}
                templates={templates}
                currentTemplateId={selectedTemplate?.id}
              />
              <button
                onClick={handleSaveLayout}
                disabled={savingLayout}
                className="btn-primary flex items-center gap-2"
              >
                {savingLayout ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save layout to "{selectedTemplate?.name}" & update files
              </button>
            </div>
          )}
        </div>

      </div>

      <details className="bg-card border border-border rounded-lg p-6">
        <summary className="cursor-pointer text-foreground">Plain text version</summary>
        <pre className="font-serif text-foreground whitespace-pre-wrap text-base leading-relaxed mt-4">
          {generatedContent}
        </pre>
      </details>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <button
          onClick={() => pdfPath && downloadStorageFile(pdfPath, `${baseName}.pdf`)}
          disabled={!pdfPath}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button
          onClick={() => docxPath && downloadStorageFile(docxPath, `${baseName}.docx`)}
          disabled={!docxPath}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download DOCX
        </button>
        <button
          onClick={() => setStep("form-fill")}
          className="btn-secondary flex items-center gap-2 border-gold/40 text-gold hover:bg-gold/10"
        >
          <Pencil className="w-4 h-4" /> Edit Form Inputs
        </button>
        <button onClick={() => navigate({ to: "/dashboard/saved" })} className="btn-secondary">
          View Saved Affidavits
        </button>
        <button onClick={handleReset} className="btn-secondary">
          Create Another
        </button>
      </div>

    </div>
  );
}
