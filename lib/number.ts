/** At most two decimals and no trailing zeros, e.g. 2, 2.5 or 0.33. */
export function formatAmount(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Parses a number typed with either "." or "," as the decimal separator. */
export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
