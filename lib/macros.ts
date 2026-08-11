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

/** Number of times each item was logged, keyed by item_id. */
export function countLogsByItem(logs: Pick<LogEntry, "item_id">[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const log of logs) {
    counts.set(log.item_id, (counts.get(log.item_id) ?? 0) + 1);
  }
  return counts;
}

export function sumMacros(items: Item[], counts: Map<string, number>): MacroTotals {
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let calories = 0;
  for (const item of items) {
    const count = counts.get(item.id) ?? 0;
    if (count === 0) continue;
    protein += item.protein * count;
    carbs += item.carbs * count;
    fat += item.fat * count;
    calories += item.calories * count;
  }
  return { protein, carbs, fat, calories };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
