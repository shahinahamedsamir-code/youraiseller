import { redirect } from "next/navigation";

export default function LegacyStockIncreaseHubPage() {
  redirect("/dashboard/inventory/stock-management");
}
