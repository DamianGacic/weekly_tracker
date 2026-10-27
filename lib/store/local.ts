import type { DataStore, Goals, Item, LogEntry, ItemInput, WeekNotes } from "@/lib/store/types";
import { caloriesFor } from "@/lib/macros";
import { NO_GOALS } from "@/lib/goals";

const ITEMS_KEY = "weekly:items";
const LOGS_KEY = "weekly:logs";
const GOALS_KEY = "weekly:goals";
const NOTES_KEY = "weekly:notes";

function readNotes(): WeekNotes {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as WeekNotes) : {};
  } catch {
    return {};
  }
}

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

export function clearLocalGoals() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GOALS_KEY);
}

export function clearLocalNotes() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NOTES_KEY);
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
    // Older locally-stored logs predate partial amounts — each one was a whole portion.
    return read<LogEntry>(LOGS_KEY).map((log) => ({ ...log, amount: log.amount ?? 1 }));
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
  async logItem(itemId: string, consumedAt?: string, amount = 1) {
    const log: LogEntry = {
      id: crypto.randomUUID(),
      item_id: itemId,
      consumed_at: consumedAt ?? new Date().toISOString(),
      amount,
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
  async getGoals() {
    if (typeof window === "undefined") return NO_GOALS;
    try {
      const raw = window.localStorage.getItem(GOALS_KEY);
      return raw ? { ...NO_GOALS, ...(JSON.parse(raw) as Partial<Goals>) } : NO_GOALS;
    } catch {
      return NO_GOALS;
    }
  },
  async saveGoals(goals: Goals) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    }
    return goals;
  },
  async listWeekNotes() {
    return readNotes();
  },
  async saveWeekNote(weekKey: string, note: string) {
    if (typeof window === "undefined") return;
    const notes = readNotes();
    if (note.trim() === "") delete notes[weekKey];
    else notes[weekKey] = note;
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  },
};
