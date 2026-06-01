import { FeatureProvider } from "@/context/FeatureContext";
import { DevAuthGuard } from "@/components/dev-admin/DevAuthGuard";
import { DevAdminShell } from "@/components/dev-admin/DevAdminShell";

export default function DevPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DevAuthGuard>
      <FeatureProvider mode="global">
        <DevAdminShell>{children}</DevAdminShell>
      </FeatureProvider>
    </DevAuthGuard>
  );
}
