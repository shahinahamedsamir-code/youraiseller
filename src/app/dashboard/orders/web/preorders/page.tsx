"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Web and approved preorders share one list (Approved → Preorder List). */
export default function WebPreordersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/orders/approved/preorders");
  }, [router]);

  return (
    <p className="py-8 text-center text-sm text-slate-500">
      Opening unified Preorder List…
    </p>
  );
}
