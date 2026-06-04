import { AutoCallIntegrationShell } from "@/components/integration/auto-call/AutoCallIntegrationShell";

export default function AutoCallLayout({ children }: { children: React.ReactNode }) {
  return <AutoCallIntegrationShell>{children}</AutoCallIntegrationShell>;
}
