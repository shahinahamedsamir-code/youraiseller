import { redirect } from "next/navigation";

export default function LegacyTransferStockPage() {
  redirect("/dashboard/inventory/stock-management");
}
