"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ChevronDown, FileText, Check } from "lucide-react";
import {
  loadShippingNotes,
  SHIPPING_NOTES_UPDATED,
  type ShippingNoteTemplate,
} from "@/lib/shipping-note-store";

type Props = {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
};

export function ShippingNoteField({ value, onChange, inputClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<ShippingNoteTemplate[]>([]);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const refresh = () => setTemplates(loadShippingNotes());
    refresh();
    window.addEventListener(SHIPPING_NOTES_UPDATED, refresh);
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => {
      window.removeEventListener(SHIPPING_NOTES_UPDATED, refresh);
      window.removeEventListener("youraiseller-data-updated", refresh);
    };
  }, []);

  const updateMenuPos = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", updateMenuPos, true);
    window.addEventListener("resize", updateMenuPos);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", updateMenuPos, true);
      window.removeEventListener("resize", updateMenuPos);
    };
  }, [open]);

  const menu =
    open && templates.length > 0 ? (
      <ul
        ref={menuRef}
        role="listbox"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
        }}
        className="z-[200] max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-200/80"
      >
        <li className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Saved notes
        </li>
        {templates.map((t) => {
          const selected = value.trim() === t.text.trim();
          return (
            <li key={t.id} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => {
                  onChange(t.text);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-start gap-2 px-3 py-2 text-left transition",
                  selected ? "bg-violet-50/90" : "hover:bg-slate-50"
                )}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800">
                    {t.label}
                  </span>
                  <span className="block text-xs leading-snug text-slate-500">
                    {t.text}
                  </span>
                </span>
                {selected && (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <div ref={anchorRef} className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a note or pick a template"
          className={clsx(inputClassName, "pr-11")}
        />
        {templates.length > 0 && (
          <button
            type="button"
            onClick={() => {
              updateMenuPos();
              setOpen((o) => !o);
            }}
            aria-label="Pick a saved note"
            aria-expanded={open}
            className={clsx(
              "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border transition",
              open
                ? "border-violet-300 bg-violet-50 text-violet-600"
                : "border-slate-200 bg-white text-slate-400 hover:text-violet-500"
            )}
          >
            <ChevronDown
              className={clsx("h-4 w-4 transition", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      {mounted && menu && createPortal(menu, document.body)}
    </div>
  );
}
