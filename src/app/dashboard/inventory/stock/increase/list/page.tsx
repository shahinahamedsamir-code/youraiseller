import { redirect } from "next/navigation";

export default function LegacyIncreaseStockListPage() {
  redirect("/dashboard/inventory/stock-management");
}
