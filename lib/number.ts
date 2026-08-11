/** Parses a number typed with either "." or "," as the decimal separator. */
export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
