export type CashMovementType = "cash_in" | "cash_out";

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  note?: string;
  createdAt: string;
};

export type CashRegisterSession = {
  id: string;
  date: string;
  openingBalance: number;
  closingBalance: number | null;
  expectedClosing: number | null;
  difference: number | null;
  status: "open" | "closed";
  movements: CashMovement[];
  openedAt: string;
  closedAt: string | null;
};

const STORAGE_KEY = "pos_cash_register";

function uid(): string {
  return `cr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function loadSessions(): CashRegisterSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CashRegisterSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: CashRegisterSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
}

export function getOpenSession(): CashRegisterSession | null {
  return loadSessions().find((s) => s.status === "open") ?? null;
}

export function openRegister(openingBalance: number): CashRegisterSession {
  const sessions = loadSessions();
  const open = sessions.find((s) => s.status === "open");
  if (open) throw new Error("A register session is already open.");

  const now = new Date();
  const session: CashRegisterSession = {
    id: uid(),
    date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    openingBalance,
    closingBalance: null,
    expectedClosing: null,
    difference: null,
    status: "open",
    movements: [],
    openedAt: now.toISOString(),
    closedAt: null,
  };
  sessions.unshift(session);
  saveSessions(sessions);
  return session;
}

export function addCashMovement(
  sessionId: string,
  type: CashMovementType,
  amount: number,
  reason: string,
  note?: string
): CashMovement {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found.");
  if (session.status === "closed") throw new Error("Session is already closed.");

  const movement: CashMovement = {
    id: uid(),
    type,
    amount,
    reason,
    note: note || undefined,
    createdAt: new Date().toISOString(),
  };
  session.movements.push(movement);
  saveSessions(sessions);
  return movement;
}

export function closeRegister(sessionId: string, actualClosing: number): CashRegisterSession {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found.");
  if (session.status === "closed") throw new Error("Session is already closed.");

  const totalIn = session.movements.filter((m) => m.type === "cash_in").reduce((s, m) => s + m.amount, 0);
  const totalOut = session.movements.filter((m) => m.type === "cash_out").reduce((s, m) => s + m.amount, 0);
  const expected = session.openingBalance + totalIn - totalOut;

  session.closingBalance = actualClosing;
  session.expectedClosing = expected;
  session.difference = actualClosing - expected;
  session.status = "closed";
  session.closedAt = new Date().toISOString();
  saveSessions(sessions);
  return session;
}

export function deleteCashMovement(sessionId: string, movementId: string) {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session || session.status === "closed") return;
  session.movements = session.movements.filter((m) => m.id !== movementId);
  saveSessions(sessions);
}

export function getSessionSummary(session: CashRegisterSession) {
  const totalIn = session.movements.filter((m) => m.type === "cash_in").reduce((s, m) => s + m.amount, 0);
  const totalOut = session.movements.filter((m) => m.type === "cash_out").reduce((s, m) => s + m.amount, 0);
  const expected = session.openingBalance + totalIn - totalOut;
  return { totalIn, totalOut, expected, movementCount: session.movements.length };
}

export function autoRecordCashSale(amount: number, reference: string, customerName?: string | null): boolean {
  const session = getOpenSession();
  if (!session) return false;
  addCashMovement(
    session.id,
    "cash_in",
    amount,
    "POS Sale",
    `${reference}${customerName ? ` — ${customerName}` : ""}`
  );
  return true;
}

export const CASH_IN_REASONS = ["POS Sale", "Due Collection", "Other Income", "Cash Deposit", "Other"];
export const CASH_OUT_REASONS = ["Expense", "Supplier Payment", "Cash Withdrawal", "Change Given", "Refund", "Other"];
