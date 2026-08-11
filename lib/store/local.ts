import type { DataStore, Item, LogEntry, ItemInput } from "@/lib/store/types";
import { caloriesFor } from "@/lib/macros";

const ITEMS_KEY = "weekly:items";
const LOGS_KEY = "weekly:logs";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function clearLocalData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ITEMS_KEY);
  window.localStorage.removeItem(LOGS_KEY);
}

export const localStore: DataStore = {
  async listItems() {
    // Older locally-stored items predate the `calories` field — backfill from the 4/4/9 formula.
    return read<Item>(ITEMS_KEY).map((item) => ({
      ...item,
      calories: item.calories ?? caloriesFor(item.protein, item.carbs, item.fat),
    }));
  },
  async listLogs() {
    return read<LogEntry>(LOGS_KEY);
  },
  async createItem(input: ItemInput) {
    const item: Item = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };
    write(ITEMS_KEY, [...read<Item>(ITEMS_KEY), item]);
    return item;
  },
  async updateItem(itemId: string, input: ItemInput) {
    const items = read<Item>(ITEMS_KEY);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) throw new Error("Item not found.");
    const updated: Item = { ...items[index], ...input };
    items[index] = updated;
    write(ITEMS_KEY, items);
    return updated;
  },
  async logItem(itemId: string, consumedAt?: string) {
    const log: LogEntry = {
      id: crypto.randomUUID(),
      item_id: itemId,
      consumed_at: consumedAt ?? new Date().toISOString(),
    };
    write(LOGS_KEY, [...read<LogEntry>(LOGS_KEY), log]);
    return log;
  },
  async deleteLog(logId: string) {
    write(
      LOGS_KEY,
      read<LogEntry>(LOGS_KEY).filter((log) => log.id !== logId)
    );
  },
};
