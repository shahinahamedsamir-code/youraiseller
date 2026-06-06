import { AutoCallIntegrationShell } from "@/components/integration/auto-call/AutoCallIntegrationShell";

export default function WebAutoCallCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AutoCallIntegrationShell variant="center">{children}</AutoCallIntegrationShell>
  );
}
