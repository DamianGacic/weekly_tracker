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
  async logItem(itemId: string) {
    const log: LogEntry = {
      id: crypto.randomUUID(),
      item_id: itemId,
      consumed_at: new Date().toISOString(),
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
