import {
  autoCallKeyDigit,
  autoCallResponseLabel,
  friendlyAutoCallCodeLabel,
  isAutoCallKeyPress,
  isAutoCallResponsePending,
  normalizeAutoCallResponseCode,
} from "./auto-call-response-codes";
import type { AutoCallLogRow } from "./auto-call-types";

export type AutoCallStatusIcon =
  | "calling"
  | "pressed1"
  | "rejected"
  | "pressed"
  | "no-answer"
  | "wrong-key"
  | "failed";

export function formatAutoCallPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) {
    return `+880${digits.slice(1)}`;
  }
  if (digits.length === 13 && digits.startsWith("880")) {
    return `+${digits}`;
  }
  return phone;
}

export function autoCallLogSource(log: AutoCallLogRow): string {
  if (log.source === "WORKFLOW") return "Order";
  if (log.source === "TEST") return "Test";
  if (log.source === "BATCH") return "Batch";
  if (log.orderId === "test") return "Test";
  if (log.orderId && log.orderId !== "unknown") return "Order";
  return "Manual";
}

export function isAutoCallLogCalling(log: AutoCallLogRow): boolean {
  if (log.status === "failed" || log.status === "completed") return false;
  if (!log.campaignId) return false;
  return log.status === "pending" || isAutoCallResponsePending(log.responseCode);
}

export function autoCallLogStatusLabel(log: AutoCallLogRow): string {
  if (isAutoCallLogCalling(log)) return "Calling";
  if (log.status === "failed") return "Failed";
  if (log.status === "pending" || isAutoCallResponsePending(log.responseCode)) {
    return "Calling";
  }
  if (log.status === "completed") return "Done";
  return "Unknown";
}

export function autoCallUserFacingLabel(log: AutoCallLogRow): string {
  return autoCallLogOutcome(log).label;
}

export type AutoCallOutcomeStyle = {
  label: string;
  className: string;
  icon?: AutoCallStatusIcon;
  pulsing?: boolean;
};

const CALLING_STYLE: AutoCallOutcomeStyle = {
  label: "Calling",
  className:
    "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-indigo-200/50",
  icon: "calling",
  pulsing: true,
};

const REJECTED_STYLE: AutoCallOutcomeStyle = {
  label: "Rejected",
  className:
    "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-200/50",
  icon: "rejected",
};

const NO_ANSWER_STYLE: AutoCallOutcomeStyle = {
  label: "No Answer",
  className:
    "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200/50",
  icon: "no-answer",
};

/** Customer answered and pressed a key on the call. */
export function isConnectedAutoCallKeyPress(log: AutoCallLogRow): boolean {
  if (log.status !== "completed") return false;
  return isAutoCallKeyPress(log.responseCode);
}

/** Show which key the customer pressed — order routing is configured separately in Setup. */
function keyPressOutcome(digit: number): AutoCallOutcomeStyle {
  if (digit === 1) {
    return {
      label: "Pressed 1",
      className:
        "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200/50",
      icon: "pressed1",
    };
  }
  if (digit === 2) {
    return {
      label: "Pressed 2",
      className:
        "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-200/50",
      icon: "pressed",
    };
  }
  return {
    label: `Pressed ${digit}`,
    className:
      "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sky-200/50",
    icon: "pressed",
  };
}

export function autoCallLogOutcome(log: AutoCallLogRow): AutoCallOutcomeStyle {
  if (isAutoCallLogCalling(log)) return CALLING_STYLE;

  const code = normalizeAutoCallResponseCode(log.responseCode);
  if (log.status === "pending" || isAutoCallResponsePending(code)) {
    return CALLING_STYLE;
  }

  const digit = autoCallKeyDigit(code);
  if (digit != null && isConnectedAutoCallKeyPress(log)) {
    return keyPressOutcome(digit);
  }

  // Call cut / did not connect
  if (code === "CD") {
    return REJECTED_STYLE;
  }

  // No pick-up or answered but no key pressed
  if (code === "CRBNR" || code === "RBNIG") {
    return NO_ANSWER_STYLE;
  }

  if (code === "WRKP") {
    return {
      label: "Wrong Key",
      className:
        "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-orange-200/50",
      icon: "wrong-key",
    };
  }
  if (code === "7533") {
    return {
      label: "Voice Not Ready",
      className:
        "bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-rose-200/50",
      icon: "failed",
    };
  }
  if (log.status === "failed") {
    return {
      label: friendlyAutoCallCodeLabel(log.responseCode) || log.error || "Failed",
      className:
        "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-200/50",
      icon: "failed",
    };
  }

  return {
    label: log.responseLabel || autoCallResponseLabel(code) || "—",
    className: "bg-slate-100 text-slate-600 ring-slate-200/80",
  };
}

/** High-level row status: Calling / Done / Failed. */
export function autoCallLogStatusBadge(log: AutoCallLogRow): AutoCallOutcomeStyle {
  if (isAutoCallLogCalling(log)) return CALLING_STYLE;
  if (log.status === "failed") {
    return {
      label: "Failed",
      className:
        "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-200/50",
      icon: "failed",
    };
  }
  if (log.status === "completed") {
    return {
      label: "Done",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 shadow-none",
      icon: "pressed1",
    };
  }
  if (log.status === "pending" || isAutoCallResponsePending(log.responseCode)) {
    return CALLING_STYLE;
  }
  return {
    label: "Unknown",
    className: "bg-slate-100 text-slate-600 ring-slate-200/80",
  };
}

export function formatAutoCallDuration(seconds: number | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatAutoCallRelativeTime(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return sentAt;

  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `about ${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `about ${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
