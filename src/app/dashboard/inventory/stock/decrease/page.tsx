import { redirect } from "next/navigation";

export default function LegacyDecreaseStockListPage() {
  redirect("/dashboard/inventory/stock-management");
}
