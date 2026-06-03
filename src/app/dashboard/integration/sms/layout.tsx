import { SmsIntegrationShell } from "@/components/integration/sms/SmsIntegrationShell";

export default function SmsIntegrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SmsIntegrationShell>{children}</SmsIntegrationShell>;
}
