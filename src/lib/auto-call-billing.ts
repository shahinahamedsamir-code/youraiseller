/** BDT charged per call attempt (platform rate from dev admin). */
export function autoCallPerAttemptChargeTaka(callPriceTaka: number): number {
  const price = callPriceTaka > 0 ? callPriceTaka : 1;
  return Math.round(price * 100) / 100;
}
