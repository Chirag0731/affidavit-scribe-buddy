import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FinancingClientForm } from "@/components/financing/financing-client-form";

export const Route = createFileRoute("/_authenticated/dashboard/financing/new")({
  component: FinancingNewPage,
  ssr: false,
});

function FinancingNewPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      <FinancingClientForm
        isAdminMode={true}
        onSubmitSuccess={(savedApp) => {
          navigate({ to: "/dashboard/financing/$id", params: { id: savedApp.id } });
        }}
        onCancel={() => {
          navigate({ to: "/dashboard/financing" });
        }}
      />
    </div>
  );
}
