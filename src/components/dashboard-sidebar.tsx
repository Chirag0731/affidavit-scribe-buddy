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
  Sparkles,
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

  const credentialNav = [
    { icon: GraduationCap, label: "Transcript / Diploma", to: "/dashboard/credentials" as const },
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
      {/* Mobile Sticky Top Header (iOS Viewport-Friendly) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 px-4 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between pt-[env(safe-area-inset-top)]">
        <Link to="/" className="flex items-center hover:opacity-85 transition-smooth">
          <BrandLogo height={30} />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl border border-border bg-card/80 hover:bg-muted text-foreground transition-smooth flex items-center gap-1.5 text-xs font-semibold"
          aria-label="Toggle Full Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:transform-none overflow-y-auto ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="min-h-full flex flex-col justify-between pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div>
            <div className="h-20 px-6 border-b border-border flex items-center justify-between">
              <Link to="/" className="flex items-center hover:opacity-85 transition-smooth py-1">
                <BrandLogo height={36} />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-5 space-y-6">
              {/* AFFIDAVITS GROUP */}
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold tracking-wider uppercase text-muted-foreground/70 flex items-center justify-between">
                  <span>Legal Affidavits</span>
                  <Sparkles className="w-3 h-3 text-gold" />
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
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-smooth ${
                          active
                            ? "bg-gold text-black font-bold shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
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

              {/* OSAP & STUDENT MANAGEMENT GROUP */}
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold tracking-wider uppercase text-gold/80 flex items-center justify-between">
                  <span>College Management</span>
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
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-smooth ${
                          active
                            ? "bg-gold text-black font-bold shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
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

          <div className="p-4 border-t border-border space-y-2 bg-muted/10">
            <Link
              to="/dashboard/settings"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-smooth ${
                isActive("/dashboard/settings")
                  ? "bg-gold text-black font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="flex-1">Settings & Roles</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth font-medium disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Top Spacer for Mobile */}
      <div className="lg:hidden h-16" />

      {/* Native-Style Bottom Quick-Nav Bar on Mobile Phones */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-lg border-t border-border flex items-center justify-around py-1.5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-smooth min-w-[56px] ${
            pathname === "/dashboard" ? "text-gold font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>Affidavits</span>
        </Link>

        <Link
          to="/dashboard/osap/clients"
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-smooth min-w-[56px] ${
            pathname.startsWith("/dashboard/osap/clients") ? "text-gold font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Clients</span>
        </Link>

        <Link
          to="/dashboard/osap/audit-center"
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-smooth min-w-[56px] ${
            pathname.startsWith("/dashboard/osap/audit") ? "text-gold font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scan className="w-5 h-5 mb-0.5" />
          <span>Audits</span>
        </Link>

        <Link
          to="/dashboard/settings"
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition-smooth min-w-[56px] ${
            pathname.startsWith("/dashboard/settings") ? "text-gold font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Settings</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-smooth min-w-[56px]"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
