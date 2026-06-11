import { promises as fs } from "fs";
import { appDataFile } from "./platform-data-path";

type DevUserRow = {
  id?: string;
  email?: string;
  name?: string;
  company?: string;
};

export async function sellerInfoForScope(scope: string): Promise<{
  userId?: string;
  userEmail?: string;
  userName?: string;
  company?: string;
}> {
  try {
    const raw = await fs.readFile(appDataFile("dev-users.json"), "utf-8");
    const users = JSON.parse(raw) as DevUserRow[];
    const row = Array.isArray(users)
      ? users.find((u) => String(u.id) === scope)
      : undefined;
    if (!row) return { userId: scope };
    return {
      userId: row.id,
      userEmail: row.email,
      userName: row.name,
      company: row.company,
    };
  } catch {
    return { userId: scope };
  }
}
