import bcrypt from "bcryptjs";

const LEGACY_PREFIX = "demo:";
const BCRYPT_ROUNDS = 10;

/** Minimum password length for new/changed passwords. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate password strength. Returns an error string if invalid, or null if OK.
 * Keeps rules light enough for sellers but blocks trivially weak passwords.
 */
export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

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
