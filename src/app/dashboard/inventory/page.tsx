import { redirect } from "next/navigation";

export default function InventoryRootPage() {
  redirect("/dashboard/inventory/products");
}
