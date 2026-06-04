/** BDT charged per call attempt (uses seller per-call duration setting). */
export function autoCallPerAttemptChargeTaka(
  perCallDurationMinutes: number,
  callPriceTaka: number
): number {
  const mins = Math.max(1, Math.min(10, perCallDurationMinutes || 3));
  const price = callPriceTaka > 0 ? callPriceTaka : 1;
  return Math.round(mins * price * 100) / 100;
}
