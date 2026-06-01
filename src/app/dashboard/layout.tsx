import { FeatureProvider } from "@/context/FeatureContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AccountGate } from "@/components/layout/AccountGate";
import { CourierEntryToast } from "@/components/orders/CourierEntryToast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureProvider>
      <AccountGate>
        <DashboardShell>
          <CourierEntryToast />
          {children}
        </DashboardShell>
      </AccountGate>
    </FeatureProvider>
  );
}
