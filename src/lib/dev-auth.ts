const AUTH_KEY = "youraiseller-dev-auth";

function readAuthFlag(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(AUTH_KEY) === "1" ||
    sessionStorage.getItem(AUTH_KEY) === "1"
  );
}

export function isDevAuthenticated(): boolean {
  return readAuthFlag();
}

export function setDevAuthenticated(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, "1");
  sessionStorage.setItem(AUTH_KEY, "1");
}

export function clearDevAuthenticated(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  fetch("/api/dev-auth/logout", { method: "POST" }).catch(() => {});
}

/** Server cookie + local flag — used before showing dev panel. */
export async function checkDevSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/dev-auth/session", { cache: "no-store" });
    if (!res.ok) return readAuthFlag();
    const data = (await res.json()) as { ok?: boolean };
    if (data.ok) {
      setDevAuthenticated();
      return true;
    }
  } catch {
    /* fall through */
  }
  return readAuthFlag();
}

export async function verifyDevPassword(input: string): Promise<boolean> {
  try {
    const res = await fetch("/api/dev-auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: input }),
      credentials: "same-origin",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    if (data.ok) {
      setDevAuthenticated();
    }
    return data.ok === true;
  } catch {
    return false;
  }
}
