import { promises as fs } from "fs";
import { platformDataFile } from "./platform-data-path";
import {
  emptyChangelog,
  normalizeChangelog,
  type ChangelogConfig,
} from "./changelog-types";

const DATA_FILE = platformDataFile("changelog.json");

export async function loadChangelog(): Promise<ChangelogConfig> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return normalizeChangelog(JSON.parse(raw));
  } catch {
    return emptyChangelog();
  }
}

export async function saveChangelog(raw: unknown): Promise<ChangelogConfig> {
  const next = normalizeChangelog(raw);
  next.updatedAt = new Date().toISOString();
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
