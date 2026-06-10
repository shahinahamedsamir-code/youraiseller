import { redirect } from "next/navigation";

export default function LegacySmartRestockPage() {
  redirect("/dashboard/inventory/stock-management");
}
