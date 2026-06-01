"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Renders children only after mount — avoids Recharts hydration issues */
export function ChartClientOnly({
  children,
  height = 280,
}: {
  children: ReactNode;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse rounded-xl bg-slate-100"
        style={{ height }}
      />
    );
  }

  return <>{children}</>;
}
