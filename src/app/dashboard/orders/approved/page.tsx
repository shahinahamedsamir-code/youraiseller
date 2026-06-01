import { redirect } from "next/navigation";

export default function ApprovedOrdersRoot() {
  redirect("/dashboard/orders/approved/list");
}
