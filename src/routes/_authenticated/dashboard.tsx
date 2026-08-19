import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { GlobalAuditTracker } from "@/components/global-audit-tracker";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-card">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-28 lg:pb-8">
          <Outlet />
        </div>
      </main>
      <GlobalAuditTracker />
    </div>
  );
}
