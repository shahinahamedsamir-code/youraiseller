import { redirect } from "next/navigation";

export default function LegacyNewDecreaseStockPage() {
  redirect("/dashboard/inventory/stock-management");
}
