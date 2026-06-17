import { redirect } from "next/navigation";

export default function PosSalesRootPage() {
  redirect("/dashboard/pos/new-sale");
}
