import { redirect } from "next/navigation";

export default function CourierIntegrationRedirectPage() {
  redirect("/dashboard/delivery");
}
