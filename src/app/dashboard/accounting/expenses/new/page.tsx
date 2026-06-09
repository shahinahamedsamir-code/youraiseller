import { redirect } from "next/navigation";

export default function LegacyNewExpensePage() {
  redirect("/dashboard/accounting/expenses");
}
