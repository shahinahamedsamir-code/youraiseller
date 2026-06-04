"use client";

import clsx from "clsx";
import { AlertCircle, Bike, Check, ExternalLink, Pencil, Truck } from "lucide-react";
import type { Order } from "@/lib/orders-store";
import {
  getCourierBrandName,
  getCourierPanelTrackingLabel,
  getCourierPanelTrackingUrl,
  getCourierTrackingDisplayId,
  orderHasCourierTracking,
} from "@/lib/courier-tracking-url";
import {
  getCourierRiderStatusLabel,
  isCourierDeliveryRiderAssigned,
} from "@/lib/courier-rider-status";

type Props = {
  order: Order;
  variant?: "compact" | "card" | "table";
  showPanelLink?: boolean;
  editing?: boolean;
  trackDraft?: string;
  onTrackDraft?: (v: string) => void;
  onTrackEdit?: () => void;
  onTrackSave?: () => void;
};

export function CourierTrackingCell({
  order,
  variant = "card",
  showPanelLink = true,
  editing,
  trackDraft = "",
  onTrackDraft,
  onTrackEdit,
  onTrackSave,
}: Props) {
  const hasTracking = orderHasCourierTracking(order);
  const panelUrl =
    hasTracking && showPanelLink ? getCourierPanelTrackingUrl(order) : null;
  const parcelLabel = getCourierPanelTrackingLabel();
  const displayId = hasTracking ? getCourierTrackingDisplayId(order) : null;
  const brand = getCourierBrandName(order);
  const riderAssigned = hasTracking && isCourierDeliveryRiderAssigned(order);
  const riderLabel = getCourierRiderStatusLabel(order);

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <input
          value={trackDraft}
          onChange={(e) => onTrackDraft?.(e.target.value)}
          placeholder="Consignment ID"
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={onTrackSave}
          className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white"
        >
          Save
        </button>
      </div>
    );
  }

  if (!displayId) {
    return (
      <button
        type="button"
        onClick={onTrackEdit}
        className={clsx(
          "text-left text-[10px] font-semibold text-slate-400 hover:text-indigo-600",
          variant === "card" &&
            "w-full rounded-lg border border-dashed border-slate-200 px-2 py-2 hover:border-indigo-300"
        )}
        title="Add courier consignment ID after push"
      >
        + Upload ID
      </button>
    );
  }

  const parcelLink = panelUrl ? (
    <a
      href={panelUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${brand} tracking — ${displayId}`}
      className="inline-flex items-center gap-0.5 font-bold text-blue-600 underline decoration-blue-400/80 hover:text-blue-800"
      onClick={(e) => e.stopPropagation()}
    >
      {parcelLabel}
      <ExternalLink
        className={clsx(
          "shrink-0 opacity-70",
          variant === "table" ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
        )}
      />
    </a>
  ) : showPanelLink ? (
    <span
      className="text-[9px] font-semibold text-amber-700"
      title="Consignment ID saved — panel link needs numeric Steadfast ID or valid courier ID"
    >
      ID saved
    </span>
  ) : null;

  const courierIcon = (
    <RiderCycleIcon
      riderAssigned={riderAssigned}
      riderLabel={riderLabel}
      brand={brand}
      panelUrl={panelUrl}
    />
  );

  if (variant === "table" || variant === "compact") {
    return (
      <div className="flex min-w-[130px] items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Check
              className="h-4 w-4 shrink-0 text-emerald-600"
              aria-label="Uploaded to courier"
            />
            <span
              className={clsx(
                "font-mono font-bold leading-tight text-slate-900",
                variant === "table" ? "text-base" : "text-[11px]"
              )}
            >
              {displayId}
            </span>
          </div>
          {showPanelLink && (
            <div
              className={clsx(
                "mt-1",
                variant === "table" ? "text-sm" : "text-[10px]"
              )}
            >
              {parcelLink}
            </div>
          )}
        </div>
        {showPanelLink && (
          <span className="shrink-0 scale-110">{courierIcon}</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-w-[150px] rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-2.5 py-2 shadow-sm">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        Upload · {brand}
      </p>
      <div className="flex items-start gap-2">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold text-slate-900">{displayId}</p>
          {showPanelLink && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {parcelLink}
              {courierIcon}
              {onTrackEdit && (
                <button
                  type="button"
                  onClick={onTrackEdit}
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 hover:text-indigo-600"
                >
                  <Pencil className="h-2.5 w-2.5" />
                  Edit ID
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Cycle icon only; hover shows status text (red/green matching icon). */
function RiderCycleIcon({
  riderAssigned,
  riderLabel,
  brand,
  panelUrl,
}: {
  riderAssigned: boolean;
  riderLabel: string;
  brand: string;
  panelUrl: string | null;
}) {
  const bikeColor = riderAssigned
    ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
    : "text-rose-600 hover:bg-rose-50 hover:text-rose-700";

  const tooltipText = riderAssigned ? "text-emerald-700" : "text-rose-700";
  const tooltipBorder = riderAssigned
    ? "border-emerald-200"
    : "border-rose-100";

  const icon = <Bike className="h-5 w-5" strokeWidth={2.25} />;

  return (
    <div className="group/rider relative inline-flex shrink-0">
      <div
        role="tooltip"
        className={clsx(
          "pointer-events-none absolute bottom-full right-0 z-50 mb-1.5",
          "opacity-0 transition-opacity duration-150",
          "group-hover/rider:opacity-100"
        )}
      >
        <div
          className={clsx(
            "relative rounded-lg border bg-white px-2.5 py-1.5 shadow-md",
            tooltipBorder
          )}
        >
          {!riderAssigned && (
            <AlertCircle
              className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-500"
              aria-hidden
            />
          )}
          <span
            className={clsx(
              "block max-w-[160px] whitespace-nowrap text-xs font-bold leading-tight",
              tooltipText
            )}
          >
            {riderLabel}
          </span>
        </div>
      </div>

      {panelUrl ? (
        <a
          href={panelUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${brand} — ${riderLabel}. Open tracking.`}
          className={clsx("rounded-md p-0.5 transition", bikeColor)}
          onClick={(e) => e.stopPropagation()}
        >
          {icon}
        </a>
      ) : (
        <span
          className={clsx("rounded-md p-0.5", bikeColor)}
          aria-label={riderLabel}
        >
          <Truck className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}
