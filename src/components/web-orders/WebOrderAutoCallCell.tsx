"use client";

import type { AutoCallLogRow } from "@/lib/auto-call-types";
import { autoCallOrderDisplay } from "@/lib/auto-call-order-status";
import { AutoCallStatusBadge } from "@/components/integration/auto-call/AutoCallStatusBadge";

type Props = {
  log: AutoCallLogRow | null;
};

export function WebOrderAutoCallCell({ log }: Props) {
  const display = autoCallOrderDisplay(log);

  if (display.label === "—") {
    return <span className="text-xs text-slate-300">—</span>;
  }

  return (
    <div className="min-w-[118px]">
      <AutoCallStatusBadge
        label={display.label}
        className={display.className}
        icon={display.icon}
        pulsing={display.pulsing}
      />
      {display.subtitle ? (
        <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{display.subtitle}</p>
      ) : null}
    </div>
  );
}
