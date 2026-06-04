"use client";

import clsx from "clsx";
import {
  loadOrderTags,
  orderTagChipClass,
  orderTagColorForLabel,
  ORDER_TAGS_UPDATED,
} from "@/lib/order-tags-store";
import { useEffect, useMemo, useState } from "react";

type Props = {
  tags?: string[];
  emptyLabel?: string;
  size?: "sm" | "md";
  className?: string;
};

export function OrderTagChips({
  tags,
  emptyLabel = "—",
  size = "sm",
  className,
}: Props) {
  const [tick, setTick] = useState(0);
  const catalog = useMemo(() => {
    void tick;
    return loadOrderTags();
  }, [tick]);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(ORDER_TAGS_UPDATED, refresh);
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => {
      window.removeEventListener(ORDER_TAGS_UPDATED, refresh);
      window.removeEventListener("youraiseller-data-updated", refresh);
    };
  }, []);

  if (!tags?.length) {
    return <span className="text-slate-400">{emptyLabel}</span>;
  }

  return (
    <div className={clsx("flex flex-wrap gap-1", className)}>
      {tags.map((label) => (
        <span
          key={label}
          className={clsx(
            "rounded-md font-bold ring-1",
            size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[10px]",
            orderTagChipClass(orderTagColorForLabel(label, catalog))
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
