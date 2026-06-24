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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

const baseNav = [
  { icon: FileText, label: "New Affidavit", to: "/dashboard" as const, exact: true },
  { icon: Save, label: "Saved Affidavits", to: "/dashboard/saved" as const },
  { icon: Settings, label: "Settings", to: "/dashboard/settings" as const },
];

export function DashboardSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: isAdmin } = useIsAdmin();

  const navItems = isAdmin
    ? [
        ...baseNav,
        { icon: ShieldCheck, label: "Templates (Admin)", to: "/dashboard/admin/templates" as const },
      ]
    : baseNav;

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
      <div className="lg:hidden fixed top-0 right-0 z-50 p-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg border border-border bg-white hover:bg-card"
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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-border transform transition-transform lg:transform-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center hover:opacity-80 transition-smooth">
              <BrandLogo height={22} />
            </Link>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to, (item as { exact?: boolean }).exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth ${
                    active ? "bg-black text-white" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-smooth font-medium disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              {loading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden h-16" />
    </>
  );
}
