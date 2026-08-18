import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Loader2,
  ExternalLink,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { getOsapActions, saveOsapAction } from "@/lib/osap-db";
import type { OsapActionItem, OsapActionStatus } from "@/types/osap";
import { ACTION_STATUS_CONFIG, ACTION_SEVERITY_CONFIG } from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/actions")({
  component: OsapActionCenterPage,
  ssr: false,
});

function OsapActionCenterPage() {
  const [actions, setActions] = useState<OsapActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    setLoading(true);
    try {
      const data = await getOsapActions();
      setActions(data);
    } catch {
      toast.error("Failed to load action items");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: OsapActionItem, newStatus: OsapActionStatus) => {
    const updated: OsapActionItem = {
      ...action,
      status: newStatus,
      resolved_at: newStatus === "completed" ? new Date().toISOString() : null,
    };
    await saveOsapAction(updated);
    setActions((prev) => prev.map((a) => (a.id === action.id ? updated : a)));
    toast.success(`Action updated to ${newStatus.replace(/_/g, " ")}`);
  };

  const filtered = actions.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        a.title.toLowerCase().includes(q) ||
        (a.client_name && a.client_name.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const openCount = actions.filter((a) => a.status === "open").length;
  const inProgressCount = actions.filter((a) => a.status === "in_progress").length;
  const waitingCount = actions.filter((a) => a.status === "waiting_on_client").length;
  const completedCount = actions.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-heading">OSAP Action Center</h1>
        <p className="text-muted-foreground mt-1">
          Review issues requiring staff or client intervention (rejected documents, missing MSFAAs, denied appeals).
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto text-sm font-medium">
        {[
          { id: "open", label: `Open (${openCount})` },
          { id: "in_progress", label: `In Progress (${inProgressCount})` },
          { id: "waiting_on_client", label: `Waiting on Client (${waitingCount})` },
          { id: "completed", label: `Completed (${completedCount})` },
          { id: "all", label: `All (${actions.length})` },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-3 border-b-2 transition-smooth whitespace-nowrap ${
                isActive
                  ? "border-gold text-gold font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by action task or client name..."
          className="input-base text-sm"
        />
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="font-semibold text-foreground text-base">No Action Items in this Category</h3>
            <p className="text-xs text-muted-foreground mt-1">
              All identified student file issues are up to date.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((act) => {
              const statusCfg = ACTION_STATUS_CONFIG[act.status];
              const sevCfg = ACTION_SEVERITY_CONFIG[act.severity];
              return (
                <div key={act.id} className="p-6 hover:bg-muted/10 transition-smooth flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-foreground text-base">{act.title}</h4>
                      <span className={`text-xs px-2.5 py-0.5 rounded font-medium ${sevCfg.bg} ${sevCfg.color}`}>
                        {sevCfg.label}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {act.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{act.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      {act.client_name && (
                        <span>Student: <strong className="text-foreground">{act.client_name}</strong></span>
                      )}
                      <span>Created {new Date(act.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <select
                      value={act.status}
                      onChange={(e) => handleStatusChange(act, e.target.value as OsapActionStatus)}
                      className="input-base text-xs py-1.5 h-auto"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_on_client">Waiting on Client</option>
                      <option value="completed">Completed</option>
                      <option value="dismissed">Dismissed</option>
                    </select>

                    <Link
                      to="/dashboard/osap/clients/$id"
                      params={{ id: act.client_id }}
                      className="px-3 py-1.5 text-xs bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 rounded font-medium transition-smooth flex items-center gap-1.5"
                    >
                      Open File <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
