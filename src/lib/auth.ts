import bcrypt from "bcryptjs";

const LEGACY_PREFIX = "demo:";
const BCRYPT_ROUNDS = 10;

/** Hash password for storage (bcrypt). */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function verifyPassword(stored: string, input: string): boolean {
  if (!stored) return false;
  if (stored.startsWith(LEGACY_PREFIX)) {
    return stored === `${LEGACY_PREFIX}${input}`;
  }
  try {
    return bcrypt.compareSync(input, stored);
  } catch {
    return false;
  }
}

export function needsPasswordRehash(stored: string): boolean {
  return stored.startsWith(LEGACY_PREFIX);
}

/** @deprecated Use hashPassword — kept for existing imports */
export function hashPasswordDemo(password: string): string {
  return hashPassword(password);
}

/** @deprecated Use verifyPassword — kept for existing imports */
export function verifyPasswordDemo(stored: string, input: string): boolean {
  return verifyPassword(stored, input);
}
