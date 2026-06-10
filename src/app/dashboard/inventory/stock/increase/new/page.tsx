import { redirect } from "next/navigation";

export default function LegacyNewIncreaseStockPage() {
  redirect("/dashboard/inventory/stock-management");
}
