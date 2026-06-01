import { redirect } from "next/navigation";

export default function LegacyNewOrderPage() {
  redirect("/dashboard/orders/approved/new");
}
