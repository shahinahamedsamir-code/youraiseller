"use client";

import clsx from "clsx";
import type { OrderLine } from "@/lib/orders-store";
import { getProductImageForLine } from "@/lib/inventory-store";

const MAX_VISIBLE = 3;

type Props = {
  items: OrderLine[];
  variant?: "table" | "cards";
  onMoreClick?: () => void;
  fallbackImage?: string;
};

export function OrderProductsList({
  items,
  variant = "table",
  onMoreClick,
  fallbackImage,
}: Props) {
  if (!items.length) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const hasMore = items.length > MAX_VISIBLE;
  const extraCount = items.length - MAX_VISIBLE;

  if (variant === "cards") {
    return (
      <div className="space-y-2">
        <CardRows
          visible={visible}
          fallbackImage={fallbackImage}
          hasMore={hasMore}
          extraCount={extraCount}
          onMoreClick={onMoreClick}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {visible.map((item, idx) => (
        <p
          key={`${item.productId}-${idx}`}
          className="text-sm font-medium text-slate-800"
        >
          <span className="font-bold text-indigo-600">{item.qty}×</span>{" "}
          {item.productName}
        </p>
      ))}
      {hasMore && (
        <MoreLabel
          onClick={onMoreClick}
          extraCount={extraCount}
          className="mt-0.5"
        />
      )}
    </div>
  );
}

function CardRows({
  visible,
  fallbackImage,
  hasMore,
  extraCount,
  onMoreClick,
}: {
  visible: OrderLine[];
  fallbackImage?: string;
  hasMore: boolean;
  extraCount: number;
  onMoreClick?: () => void;
}) {
  return (
    <>
      {visible.map((item, idx) => {
        const img = getProductImageForLine(item) ?? fallbackImage;
        return (
          <div
            key={`${item.productId}-${idx}`}
            className="flex gap-2 rounded-lg border border-slate-100 bg-white p-2"
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-400">
                {item.productCode.slice(0, 3)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">
                {item.productName}
              </p>
              <p className="text-xs text-slate-500">Qty: {item.qty}</p>
            </div>
          </div>
        );
      })}
      {hasMore && (
        <MoreLabel onClick={onMoreClick} extraCount={extraCount} />
      )}
    </>
  );
}

function MoreLabel({
  onClick,
  extraCount,
  className,
}: {
  onClick?: () => void;
  extraCount: number;
  className?: string;
}) {
  const label =
    extraCount > 0 ? `+${extraCount} more` : "more";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title={extraCount > 0 ? `${extraCount} more products` : undefined}
        className={clsx(
          "text-sm font-extrabold text-blue-600 underline decoration-blue-400/80 hover:text-blue-800",
          className
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <p className={clsx("text-sm font-extrabold text-blue-600", className)}>
      {label}
    </p>
  );
}
