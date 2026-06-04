"use client";

import clsx from "clsx";
import {
  Check,
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  X,
} from "lucide-react";
import type { AutoCallStatusIcon } from "@/lib/auto-call-log-display";

export type AutoCallStatusBadgeProps = {
  label: string;
  className: string;
  icon?: AutoCallStatusIcon;
  pulsing?: boolean;
  size?: "sm" | "md";
};

const ICONS = {
  calling: PhoneCall,
  pressed1: Check,
  rejected: X,
  pressed: Phone,
  "no-answer": PhoneMissed,
  "wrong-key": X,
  failed: PhoneOff,
} as const;

export function AutoCallStatusBadge({
  label,
  className,
  icon,
  pulsing,
  size = "sm",
}: AutoCallStatusBadgeProps) {
  const Icon = icon ? ICONS[icon] : null;

  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-extrabold leading-none shadow-sm ring-1 ring-inset ring-white/25",
        size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        pulsing && "animate-pulse",
        className
      )}
    >
      {pulsing ? (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current opacity-90" />
        </span>
      ) : Icon ? (
        <Icon className={clsx("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
