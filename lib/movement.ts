import type { MovementKind, MovementLog } from "@/lib/store/types";
import { formatAmount } from "@/lib/number";

/** Display order wherever moves and positions are listed separately. */
export const KINDS: MovementKind[] = ["reps", "time"];

export const KIND_LABELS: Record<MovementKind, { one: string; many: string }> = {
  reps: { one: "Move", many: "Moves" },
  time: { one: "Position", many: "Positions" },
};

/** Position goals are entered and shown in minutes, but stored in seconds like their logs. */
export const GOAL_UNITS: Record<MovementKind, { unit: string; scale: number }> = {
  reps: { unit: " reps", scale: 1 },
  time: { unit: " min", scale: 60 },
};

/** Total amount logged of each movement (reps, or seconds), keyed by movement_id. */
export function totalsByMovement(
  logs: Pick<MovementLog, "movement_id" | "amount">[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const log of logs) {
    totals.set(log.movement_id, (totals.get(log.movement_id) ?? 0) + log.amount);
  }
  return totals;
}

/** "45 s", "2 min 30 s", "1 h 5 min". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  return rest > 0 ? `${minutes} min ${rest} s` : `${minutes} min`;
}

export function formatMovementAmount(kind: MovementKind, amount: number): string {
  return kind === "reps" ? `${formatAmount(amount)} reps` : formatDuration(amount);
}

/** Seconds from "90", "1:30" (m:ss) or "1:02:30" (h:mm:ss); NaN for anything else. */
export function parseDuration(value: string): number {
  if (value.trim() === "") return NaN;
  const parts = value.split(":").map((part) => Number(part.trim().replace(",", ".")));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  return parts.reduce((total, n) => total * 60 + n, 0);
}
