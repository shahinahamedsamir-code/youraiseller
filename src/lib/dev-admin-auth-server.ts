import { cookies } from "next/headers";
import { DEV_AUTH_COOKIE } from "./dev-auth-cookie";

export function isDevAdminAuthenticated(): boolean {
  const cookie = cookies().get(DEV_AUTH_COOKIE);
  return cookie?.value === "1";
}
