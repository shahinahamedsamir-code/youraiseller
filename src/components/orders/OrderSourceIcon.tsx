"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import {
  Globe,
  Phone,
  HelpCircle,
  RefreshCw,
  Link2,
  type LucideIcon,
} from "lucide-react";
import type { OrderSource } from "@/lib/order-source";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { box: string; icon: string }> = {
  sm: { box: "h-7 w-7", icon: "h-3.5 w-3.5" },
  md: { box: "h-9 w-9", icon: "h-4 w-4" },
  lg: { box: "h-11 w-11", icon: "h-5 w-5" },
};

type Meta = {
  bg: string;
  Lucide?: LucideIcon;
  svg?: ReactNode;
  /** Use dark icon on light background */
  mutedIcon?: boolean;
};

const META: Record<OrderSource, Meta> = {
  facebook: {
    bg: "bg-[#1877F2]",
    svg: (
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] fill-white" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  website: { bg: "bg-gradient-to-br from-teal-500 to-cyan-600", Lucide: Globe },
  direct: { bg: "bg-gradient-to-br from-violet-500 to-indigo-600", Lucide: Phone },
  unknown: { bg: "bg-slate-100 ring-1 ring-slate-200", Lucide: HelpCircle, mutedIcon: true },
  instagram: {
    bg: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
    svg: (
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] fill-white" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  tiktok: {
    bg: "bg-slate-900",
    svg: (
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] fill-white" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
      </svg>
    ),
  },
  whatsapp: {
    bg: "bg-[#25D366]",
    svg: (
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] fill-white" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  exchange: {
    bg: "bg-gradient-to-br from-amber-400 to-orange-500",
    Lucide: RefreshCw,
  },
  messenger: {
    bg: "bg-gradient-to-br from-[#00B2FF] to-[#006AFF]",
    svg: (
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] fill-white" aria-hidden>
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963-3.055-3.26-5.963 3.26L10.732 8.4l3.126 3.26 5.909-3.26-6.576 6.563z" />
      </svg>
    ),
  },
  custom: {
    bg: "bg-gradient-to-br from-indigo-500 to-violet-600",
    Lucide: Link2,
  },
};

type Props = {
  source: OrderSource;
  size?: Size;
  className?: string;
};

export function OrderSourceIcon({ source, size = "md", className }: Props) {
  const meta = META[source];
  const s = sizeMap[size];
  const Lucide = meta.Lucide;

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-black/5",
        s.box,
        meta.bg,
        className
      )}
    >
      {meta.svg ??
        (Lucide && (
          <Lucide
            className={clsx(
              s.icon,
              meta.mutedIcon ? "text-slate-500" : "text-white"
            )}
          />
        ))}
    </span>
  );
}
