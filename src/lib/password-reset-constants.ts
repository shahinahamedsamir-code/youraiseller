/** Password reset link validity — 5 minutes. */
export const PASSWORD_RESET_TTL_MS = 5 * 60 * 1000;

export const PASSWORD_RESET_TTL_MINUTES = Math.round(PASSWORD_RESET_TTL_MS / 60_000);
