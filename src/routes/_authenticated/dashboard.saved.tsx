import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type Affidavit, safeFilename } from "@/types/neptora";
import { downloadStorageFile, deleteAffidavitFiles } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/dashboard/saved")({
  component: SavedAffidavitsPage,
});

function SavedAffidavitsPage() {
  const [affidavits, setAffidavits] = useState<Affidavit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAffidavits();
  }, []);

  const fetchAffidavits = async () => {
    try {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase
        .from("affidavits" as never)
        .select("*")
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (err) throw err;
      setAffidavits((data as unknown as Affidavit[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load affidavits");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a: Affidavit) => {
    if (!window.confirm("Delete this affidavit and its files?")) return;
    try {
      await deleteAffidavitFiles([a.docx_path, a.pdf_path].filter(Boolean) as string[]);
      const { error: err } = await supabase
        .from("affidavits" as never)
        .delete()
        .eq("id", a.id);
      if (err) throw err;
      setAffidavits((prev) => prev.filter((x) => x.id !== a.id));
      toast.success("Affidavit deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="section-heading mb-2">Saved Affidavits</h1>
        <p className="text-gray-600">All your generated affidavits.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {affidavits.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-12 text-center bg-white">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No Affidavits Yet</h3>
          <p className="text-gray-600 mb-6">Create your first affidavit now.</p>
          <Link to="/dashboard" className="btn-primary inline-flex gap-2">
            <FileText className="w-4 h-4" /> Create Affidavit
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {affidavits.map((a) => {
            const base = safeFilename(a.client_name) || "affidavit";
            return (
              <div
                key={a.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-smooth bg-white"
              >
                <button
                  onClick={() => toggleExpanded(a.id)}
                  className="w-full p-4 lg:p-6 flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{a.client_name}</h3>
                      <p className="text-sm text-gray-600">{a.template_name || "Custom"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 capitalize">
                          {a.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedIds.has(a.id) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedIds.has(a.id) && (
                  <div className="border-t border-gray-200 p-4 lg:p-6 bg-gray-50 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <div className="text-xs text-gray-600 mb-1">Client Name</div>
                        <div className="font-medium text-gray-900">{a.client_name}</div>
                      </div>
                      {a.matter_reference && (
                        <div className="bg-white border border-gray-200 rounded p-3">
                          <div className="text-xs text-gray-600 mb-1">Matter Reference</div>
                          <div className="font-medium text-gray-900">{a.matter_reference}</div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Document Preview</h4>
                      <pre className="bg-white border border-gray-200 rounded p-4 font-serif text-sm text-gray-900 whitespace-pre-wrap max-h-96 overflow-auto">
                        {a.generated_content}
                      </pre>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() =>
                          a.pdf_path
                            ? downloadStorageFile(a.pdf_path, `${base}.pdf`)
                            : toast.error("No PDF available")
                        }
                        disabled={!a.pdf_path}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-900 transition-smooth disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" /> Download PDF
                      </button>
                      <button
                        onClick={() =>
                          a.docx_path
                            ? downloadStorageFile(a.docx_path, `${base}.docx`)
                            : toast.error("No DOCX available")
                        }
                        disabled={!a.docx_path}
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-900 rounded hover:bg-gray-100 transition-smooth disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" /> Download DOCX
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded transition-smooth ml-auto"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
