"use client";

import clsx from "clsx";

type Props = {
  percent: number;
  size?: number;
};

export function WebOrderSuccessRing({ percent, size = 52 }: Props) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color =
    percent >= 80
      ? "text-emerald-500"
      : percent >= 50
        ? "text-amber-500"
        : "text-rose-500";

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={clsx("transition-all", color)}
        />
      </svg>
      <span
        className={clsx(
          "absolute inset-0 flex items-center justify-center text-[11px] font-extrabold",
          color
        )}
      >
        {percent}%
      </span>
    </div>
  );
}
