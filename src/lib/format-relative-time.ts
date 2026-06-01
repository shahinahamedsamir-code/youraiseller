import { parseActivityDate } from "./order-activity";

export function formatRelativeTime(dateStr: string): string {
  const t = parseActivityDate(dateStr);
  if (!t) return "Updated recently";

  const diffMs = Date.now() - t;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Updated just now";
  if (diffMin < 60) {
    return `Updated ${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `Updated ${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return `Updated ${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  }
  return `Updated ${new Date(t).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })}`;
}
