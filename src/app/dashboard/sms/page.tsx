import { redirect } from "next/navigation";

export default function LegacySmsRedirectPage() {
  redirect("/dashboard/integration/sms");
}
