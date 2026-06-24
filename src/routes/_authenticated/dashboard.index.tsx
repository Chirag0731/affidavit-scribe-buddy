import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type Template,
  type MergeField,
  buildAffidavitDoc,
  renderAffidavitText,
  safeFilename,
} from "@/types/neptora";
import { generateDocx, generatePdf } from "@/lib/doc-generator";
import { uploadAffidavitFile, downloadStorageFile } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: NewAffidavitPage,
});

type Step = "template-selection" | "form-fill" | "preview";

function NewAffidavitPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchTemplates();
  }, []);

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
      setTemplates((data as unknown as Template[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({});
    setError("");
    setStep("form-fill");
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
      const affDoc = buildAffidavitDoc(selectedTemplate, formData);
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

      const { error: insertErr } = await supabase
        .from("affidavits" as never)
        .insert({
          user_id: user.id,
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          client_name: clientName,
          matter_reference: matterReference || null,
          form_data: formData,
          generated_content: content,
          docx_path: uploadedDocx,
          pdf_path: uploadedPdf,
          status: "generated",
        } as never);
      if (insertErr) throw insertErr;

      toast.success("Affidavit generated and saved");
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate affidavit");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setStep("template-selection");
    setSelectedTemplate(null);
    setFormData({});
    setClientName("");
    setMatterReference("");
    setError("");
    setGeneratedContent("");
    setDocxPath(null);
    setPdfPath(null);
  };

  if (step === "template-selection") {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="section-heading mb-2">New Affidavit</h1>
          <p className="text-muted-foreground">Select a template to get started.</p>
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
                className="text-left border border-border rounded-lg p-6 hover:shadow-md hover:border-gold transition-smooth group bg-white"
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
        <div>
          <button
            onClick={() => setStep("template-selection")}
            className="flex items-center gap-2 text-gold hover:text-gold-dark transition-smooth font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Templates
          </button>
          <h1 className="section-heading mb-2">{selectedTemplate.name}</h1>
          <p className="text-muted-foreground">
            Fill in the information below. The legal wording is fixed — only these variables are
            replaced.
          </p>
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
          className="bg-white border border-border rounded-lg p-8 space-y-8"
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
              {generating ? "Generating DOCX & PDF..." : "Generate Affidavit"}
            </button>
            <button
              type="button"
              onClick={() => setStep("template-selection")}
              className="btn-secondary"
              disabled={generating}
            >
              Cancel
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

      <div>
        <h1 className="section-heading mb-2">Preview</h1>
        <p className="text-muted-foreground">Review the generated affidavit below.</p>
      </div>

      <div className="bg-white border border-border rounded-lg p-8">
        <pre className="font-serif text-foreground whitespace-pre-wrap text-base leading-relaxed">
          {generatedContent}
        </pre>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
