/** Simple demo auth — replace with bcrypt + DB in production */

export function hashPasswordDemo(password: string): string {
  return `demo:${password}`;
}

export function verifyPasswordDemo(stored: string, input: string): boolean {
  return stored === hashPasswordDemo(input);
}
