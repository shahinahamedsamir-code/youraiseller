"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshCurrentSessionUser } from "@/lib/dev-users";

/** If already signed in on this browser, skip login/signup and go to the right page. */
export function AuthSessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await refreshCurrentSessionUser();
      if (cancelled || !user) return;
      if (user.status === "active") {
        router.replace("/dashboard");
      } else if (user.status !== "rejected") {
        router.replace("/renew");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
