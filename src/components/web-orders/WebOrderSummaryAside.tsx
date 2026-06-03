"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChevronDown, PanelRight } from "lucide-react";

type Props = {
  children: ReactNode;
};

/** Right summary — sticky on desktop, collapsible tab on mobile. */
export function WebOrderSummaryAside({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="xl:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50/80 px-4 py-3 text-left shadow-sm"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold text-teal-900">
            <PanelRight className="h-4 w-4" />
            Order summary
          </span>
          <ChevronDown
            className={clsx(
              "h-4 w-4 text-teal-600 transition",
              mobileOpen && "rotate-180"
            )}
          />
        </button>
        {mobileOpen ? <div className="mt-3">{children}</div> : null}
      </div>

      <aside className="hidden w-full shrink-0 xl:block xl:sticky xl:top-4 xl:w-[300px] 2xl:w-[320px]">
        {children}
      </aside>
    </>
  );
}
