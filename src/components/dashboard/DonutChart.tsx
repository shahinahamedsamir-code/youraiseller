"use client";

import { useEffect, useState, type ReactNode } from "react";

type DonutSegment = {
  name: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutSegment[];
  centerLabel?: ReactNode;
  innerRadius?: number;
  outerRadius?: number;
};

const CHART_SIZE = 240;
const SEGMENT_GAP = 2;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function donutSegmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    const midR = (innerR + outerR) / 2;
    const strokeW = outerR - innerR;
    return {
      type: "stroke" as const,
      midR,
      strokeW,
      color: "",
    };
  }

  const largeArc = sweep > 180 ? 1 : 0;
  const outerStart = polar(cx, cy, outerR, startAngle);
  const outerEnd = polar(cx, cy, outerR, endAngle);
  const innerEnd = polar(cx, cy, innerR, endAngle);
  const innerStart = polar(cx, cy, innerR, startAngle);

  return {
    type: "path" as const,
    d: [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" "),
  };
}

function buildSegments(
  data: DonutSegment[],
  innerR: number,
  outerR: number
) {
  const cx = CHART_SIZE / 2;
  const cy = CHART_SIZE / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return [];

  const single = data.length === 1;
  const gap = single ? 0 : SEGMENT_GAP;
  const totalGap = gap * data.length;
  const available = 360 - totalGap;
  let cursor = 0;

  return data.map((item) => {
    const sweep = (item.value / total) * available;
    const start = cursor;
    const end = cursor + sweep;
    const geom = donutSegmentPath(cx, cy, innerR, outerR, start, end);
    cursor = end + gap;
    return { ...item, geom };
  });
}

export function DonutCenter({
  label,
  value,
  hint,
  valueClassName = "text-2xl",
}: {
  label?: string;
  value: string | number;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <>
      {label && (
        <p className="text-[10px] font-medium leading-tight text-slate-500">{label}</p>
      )}
      <p
        className={`font-bold tabular-nums leading-none tracking-tight text-slate-900 ${valueClassName}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 max-w-[88px] truncate text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
          {hint}
        </p>
      )}
    </>
  );
}

export function DonutChart({
  data,
  centerLabel,
  innerRadius = 58,
  outerRadius = 88,
}: DonutChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = data.filter((d) => d.value > 0);
  const holeSize = innerRadius * 2;
  const center = CHART_SIZE / 2;
  const segments = buildSegments(chartData, innerRadius, outerRadius);
  const singleSlice = chartData.length === 1;

  if (!mounted) {
    return (
      <div
        className="mx-auto shrink-0 animate-pulse rounded-full bg-slate-100"
        style={{ width: CHART_SIZE, height: CHART_SIZE }}
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        className="mx-auto flex shrink-0 items-center justify-center rounded-full bg-slate-50 text-sm text-slate-500"
        style={{ width: CHART_SIZE, height: CHART_SIZE }}
      >
        No data
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto shrink-0"
      style={{ width: CHART_SIZE, height: CHART_SIZE }}
    >
      <svg
        width={CHART_SIZE}
        height={CHART_SIZE}
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="block"
        role="img"
        aria-hidden
      >
        {singleSlice ? (
          <circle
            cx={center}
            cy={center}
            r={(innerRadius + outerRadius) / 2}
            fill="none"
            stroke={chartData[0].color}
            strokeWidth={outerRadius - innerRadius}
          />
        ) : (
          segments.map((seg) =>
            seg.geom.type === "path" ? (
              <path key={seg.name} d={seg.geom.d} fill={seg.color} />
            ) : null
          )
        )}
      </svg>

      {centerLabel && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white/95 text-center shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm"
          style={{ width: holeSize, height: holeSize }}
        >
          {centerLabel}
        </div>
      )}
    </div>
  );
}
