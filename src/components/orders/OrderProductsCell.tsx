"use client";

import clsx from "clsx";
import type { OrderLine } from "@/lib/orders-store";
import { getProductImageForLine } from "@/lib/inventory-store";
import { OrderProductsList } from "./OrderProductsList";

const MAX_VISIBLE = 3;

type Props = {
  items: OrderLine[];
  onMoreClick?: () => void;
};

function ProductThumb({
  item,
  compact,
  moreBadge,
  onMoreClick,
}: {
  item: OrderLine;
  compact: boolean;
  moreBadge?: boolean;
  onMoreClick?: () => void;
}) {
  const img = getProductImageForLine(item);
  const size = compact ? "h-10 w-10" : "h-14 w-14";
  const textSize = compact ? "text-[10px]" : "text-sm";

  return (
    <div className={clsx("relative shrink-0", size)}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          className={clsx(
            size,
            "rounded-lg object-cover ring-1 ring-slate-200"
          )}
        />
      ) : (
        <div
          className={clsx(
            size,
            "flex items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-400 ring-1 ring-slate-200",
            textSize
          )}
        >
          {item.productCode.slice(0, 2) ?? "—"}
        </div>
      )}
      {moreBadge && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick?.();
          }}
          className={clsx(
            "absolute inset-x-0 bottom-0 rounded-b-lg px-0.5 py-0.5 text-center",
            "bg-slate-900/75 text-[8px] font-extrabold uppercase tracking-wide text-white",
            "hover:bg-slate-900/90",
            onMoreClick && "cursor-pointer"
          )}
        >
          more
        </button>
      )}
    </div>
  );
}

/** Products column: up to 3 thumbnails + name list */
export function OrderProductsCell({ items, onMoreClick }: Props) {
  if (!items.length) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  const thumbs = items.slice(0, MAX_VISIBLE);
  const hasMore = items.length > MAX_VISIBLE;
  const compact = items.length > 1;

  return (
    <div className="flex items-start gap-2.5">
      <div
        className={clsx(
          "flex shrink-0 flex-col",
          compact ? "gap-1" : ""
        )}
      >
        {thumbs.map((item, idx) => (
          <ProductThumb
            key={`${item.productId}-${idx}`}
            item={item}
            compact={compact}
            moreBadge={hasMore && idx === thumbs.length - 1}
            onMoreClick={onMoreClick}
          />
        ))}
      </div>
      <OrderProductsList
        items={items}
        variant="table"
        onMoreClick={onMoreClick}
      />
    </div>
  );
}
