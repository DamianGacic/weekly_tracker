import type { Item, LogEntry } from "@/lib/store/types";

export type MacroTotals = {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
};

export const ZERO_MACROS: MacroTotals = { protein: 0, carbs: 0, fat: 0, calories: 0 };

export function caloriesFor(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

/** Total portions logged of each item (the sum of its logs' amounts), keyed by item_id. */
export function portionsByItem(
  logs: Pick<LogEntry, "item_id" | "amount">[]
): Map<string, number> {
  const portions = new Map<string, number>();
  for (const log of logs) {
    portions.set(log.item_id, (portions.get(log.item_id) ?? 0) + log.amount);
  }
  return portions;
}

/** Macros for `portions` portions of `item`. */
export function macrosFor(item: Item, portions: number): MacroTotals {
  return {
    protein: item.protein * portions,
    carbs: item.carbs * portions,
    fat: item.fat * portions,
    calories: item.calories * portions,
  };
}

export function sumMacros(items: Item[], portions: Map<string, number>): MacroTotals {
  const totals = { ...ZERO_MACROS };
  for (const item of items) {
    const itemTotals = macrosFor(item, portions.get(item.id) ?? 0);
    totals.protein += itemTotals.protein;
    totals.carbs += itemTotals.carbs;
    totals.fat += itemTotals.fat;
    totals.calories += itemTotals.calories;
  }
  return totals;
}

/**
 * Each macro's share (0..1) of the calories coming from protein, carbs and
 * fat (4/4/9 kcal per gram), or null when all three are zero.
 */
export function calorieShares(
  protein: number,
  carbs: number,
  fat: number
): { protein: number; carbs: number; fat: number } | null {
  const total = caloriesFor(protein, carbs, fat);
  if (total <= 0) return null;
  return { protein: (protein * 4) / total, carbs: (carbs * 4) / total, fat: (fat * 9) / total };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
