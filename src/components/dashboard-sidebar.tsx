import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BrandLogo } from "@/components/brand-logo";
import {
  FileText,
  Save,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FileCheck,
  AlertTriangle,
  Scan,
  History,
  ArrowUpDown,
  Sliders,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

export function DashboardSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: isAdmin } = useIsAdmin();

  const affidavitNav = [
    { icon: FileText, label: "New Affidavit", to: "/dashboard" as const, exact: true },
    { icon: Save, label: "Saved Affidavits", to: "/dashboard/saved" as const },
    ...(isAdmin
      ? [{ icon: ShieldCheck, label: "Templates (Admin)", to: "/dashboard/admin/templates" as const }]
      : []),
  ];

  const osapNav = [
    { icon: LayoutDashboard, label: "OSAP Dashboard", to: "/dashboard/osap" as const, exact: true },
    { icon: Users, label: "Clients", to: "/dashboard/osap/clients" as const },
    { icon: FileSpreadsheet, label: "Applications", to: "/dashboard/osap/applications" as const },
    { icon: FileCheck, label: "Documents", to: "/dashboard/osap/documents" as const },
    { icon: AlertTriangle, label: "Action Center", to: "/dashboard/osap/actions" as const },
    { icon: Scan, label: "Audit Center", to: "/dashboard/osap/audit-center" as const },
    { icon: History, label: "Audit History", to: "/dashboard/osap/audit-history" as const },
    { icon: ArrowUpDown, label: "Import / Export", to: "/dashboard/osap/import-export" as const },
    { icon: Sliders, label: "OSAP Settings", to: "/dashboard/osap/settings" as const },
  ];

  const handleLogout = async () => {
    setLoading(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 px-4 bg-card border-b border-border flex items-center justify-between">
        <Link to="/" className="flex items-center hover:opacity-85 transition-smooth">
          <BrandLogo height={30} />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg border border-border bg-card hover:bg-muted"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform lg:transform-none overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="min-h-full flex flex-col justify-between">
          <div>
            <div className="h-20 px-6 border-b border-border flex items-center">
              <Link to="/" className="flex items-center hover:opacity-85 transition-smooth py-1">
                <BrandLogo height={36} />
              </Link>
            </div>

            <div className="px-4 py-5 space-y-6">
              {/* AFFIDAVITS GROUP */}
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold tracking-wider uppercase text-muted-foreground/70">
                  Affidavits
                </div>
                <nav className="space-y-1">
                  {affidavitNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, (item as { exact?: boolean }).exact);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
                          active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="w-3.5 h-3.5" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* OSAP MANAGEMENT GROUP */}
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold tracking-wider uppercase text-gold/80 flex items-center justify-between">
                  <span>OSAP Management</span>
                  <span className="text-[9px] bg-gold/15 text-gold border border-gold/30 px-1.5 py-0.5 rounded font-semibold uppercase tracking-normal">
                    Active
                  </span>
                </div>
                <nav className="space-y-1">
                  {osapNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, (item as { exact?: boolean }).exact);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
                          active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="w-3.5 h-3.5" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border space-y-1">
            <Link
              to="/dashboard/settings"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
                isActive("/dashboard/settings") ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="flex-1">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth font-medium disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {loading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden h-16" />
    </>
  );
}
