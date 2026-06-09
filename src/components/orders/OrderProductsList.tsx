"use client";

import clsx from "clsx";
import type { OrderLine } from "@/lib/orders-store";
import { getProductImageForLine } from "@/lib/inventory-store";

const MAX_VISIBLE = 3;

type Props = {
  items: OrderLine[];
  variant?: "table" | "cards";
  onMoreClick?: () => void;
  onProductClick?: (items: OrderLine[]) => void;
  fallbackImage?: string;
};

export function OrderProductsList({
  items,
  variant = "table",
  onMoreClick,
  onProductClick,
  fallbackImage,
}: Props) {
  if (!items.length) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const hasMore = items.length > MAX_VISIBLE;
  const extraCount = items.length - MAX_VISIBLE;
  const showAll = () => onProductClick?.(items);

  if (variant === "cards") {
    return (
      <div className="space-y-2">
        <CardRows
          visible={visible}
          fallbackImage={fallbackImage}
          hasMore={hasMore}
          extraCount={extraCount}
          onShowAll={onProductClick ? showAll : undefined}
          onMoreClick={onMoreClick}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {visible.map((item, idx) => (
        <ProductLineButton
          key={`${item.productId}-${idx}`}
          item={item}
          onShowAll={onProductClick ? showAll : undefined}
        />
      ))}
      {hasMore && (
        <MoreLabel
          onClick={onProductClick ? showAll : onMoreClick}
          extraCount={extraCount}
          className="mt-0.5"
        />
      )}
    </div>
  );
}

function ProductLineButton({
  item,
  onShowAll,
  className,
}: {
  item: OrderLine;
  onShowAll?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <span className="font-bold text-indigo-600">{item.qty}×</span> {item.productName}
    </>
  );

  if (!onShowAll) {
    return (
      <p
        className={clsx(
          "break-words text-sm font-medium leading-snug text-slate-800",
          className
        )}
      >
        {content}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onShowAll();
      }}
      className={clsx(
        "block w-full text-left text-sm font-medium text-slate-800 transition hover:text-violet-700 hover:underline",
        className
      )}
    >
      {content}
    </button>
  );
}

function CardRows({
  visible,
  fallbackImage,
  hasMore,
  extraCount,
  onShowAll,
  onMoreClick,
}: {
  visible: OrderLine[];
  fallbackImage?: string;
  hasMore: boolean;
  extraCount: number;
  onShowAll?: () => void;
  onMoreClick?: () => void;
}) {
  return (
    <>
      {visible.map((item, idx) => {
        const img = getProductImageForLine(item) ?? fallbackImage;
        return (
          <button
            key={`${item.productId}-${idx}`}
            type="button"
            onClick={() => onShowAll?.()}
            disabled={!onShowAll}
            className={clsx(
              "flex w-full gap-2 rounded-lg border border-slate-100 bg-white p-2 text-left transition",
              onShowAll && "hover:border-violet-200 hover:bg-violet-50/40"
            )}
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
          </button>
        );
      })}
      {hasMore && (
        <MoreLabel
          onClick={onShowAll ?? onMoreClick}
          extraCount={extraCount}
        />
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
  const label = extraCount > 0 ? `+${extraCount} more` : "more";

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
