"use client";

import clsx from "clsx";
import type { OrderLine } from "@/lib/orders-store";
import { getProductImageForLine } from "@/lib/inventory-store";
import { OrderProductsList } from "./OrderProductsList";

const MAX_VISIBLE = 3;

type Props = {
  items: OrderLine[];
  onMoreClick?: () => void;
  onProductClick?: (items: OrderLine[]) => void;
};

function ProductThumb({
  item,
  compact,
  moreBadge,
  onShowAll,
}: {
  item: OrderLine;
  compact: boolean;
  moreBadge?: boolean;
  onShowAll?: () => void;
}) {
  const img = getProductImageForLine(item);
  const size = compact ? "h-10 w-10" : "h-14 w-14";
  const textSize = compact ? "text-[10px]" : "text-sm";

  const thumb = img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt=""
      className={clsx(size, "rounded-lg object-cover ring-1 ring-slate-200")}
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
  );

  return (
    <div className={clsx("relative shrink-0", size)}>
      {onShowAll && !moreBadge ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowAll();
          }}
          className="block rounded-lg transition hover:opacity-90 hover:ring-2 hover:ring-violet-300"
        >
          {thumb}
        </button>
      ) : (
        thumb
      )}
      {moreBadge && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowAll?.();
          }}
          className={clsx(
            "absolute inset-x-0 bottom-0 rounded-b-lg px-0.5 py-0.5 text-center",
            "bg-slate-900/75 text-[8px] font-extrabold uppercase tracking-wide text-white",
            "hover:bg-slate-900/90",
            onShowAll && "cursor-pointer"
          )}
        >
          more
        </button>
      )}
    </div>
  );
}

/** Products column: up to 3 thumbnails + name list */
export function OrderProductsCell({ items, onMoreClick, onProductClick }: Props) {
  if (!items.length) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  const thumbs = items.slice(0, MAX_VISIBLE);
  const hasMore = items.length > MAX_VISIBLE;
  const compact = items.length > 1;
  const showAll = () => onProductClick?.(items);

  return (
    <div className="flex items-start gap-2.5">
      <div className={clsx("flex shrink-0 flex-col", compact ? "gap-1" : "")}>
        {thumbs.map((item, idx) => (
          <ProductThumb
            key={`${item.productId}-${idx}`}
            item={item}
            compact={compact}
            moreBadge={hasMore && idx === thumbs.length - 1}
            onShowAll={onProductClick ? showAll : undefined}
          />
        ))}
      </div>
      <OrderProductsList
        items={items}
        variant="table"
        onMoreClick={onMoreClick}
        onProductClick={onProductClick}
      />
    </div>
  );
}
