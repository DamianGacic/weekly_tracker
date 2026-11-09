import type {
  DataStore,
  Goals,
  Habit,
  HabitCheck,
  HabitInput,
  Item,
  LogEntry,
  ItemInput,
  Movement,
  MovementInput,
  MovementLog,
  RawMacroEntry,
  RawMacroInput,
  WeekNotes,
} from "@/lib/store/types";
import { caloriesFor } from "@/lib/macros";
import { NO_GOALS } from "@/lib/goals";

const ITEMS_KEY = "weekly:items";
const LOGS_KEY = "weekly:logs";
const RAW_MACROS_KEY = "weekly:raw-macros";
const GOALS_KEY = "weekly:goals";
const NOTES_KEY = "weekly:notes";
const MOVEMENTS_KEY = "weekly:movements";
const MOVEMENT_LOGS_KEY = "weekly:movement-logs";
const HABITS_KEY = "weekly:habits";
const HABIT_CHECKS_KEY = "weekly:habit-checks";

/**
 * Habit names are unique per account in Supabase, so they're kept unique here
 * too: otherwise uploading local habits on sign-in would fail. Thrown with the
 * same code Postgres uses, so the dialog shows the same message either way.
 */
function assertUniqueHabitName(habits: Habit[], name: string, exceptId?: string) {
  if (habits.some((habit) => habit.name === name && habit.id !== exceptId)) {
    throw Object.assign(new Error(`You already have a habit called “${name}”.`), { code: "23505" });
  }
}

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

function patchItem(itemId: string, patch: Partial<Omit<Item, "id" | "created_at">>): Item {
  const items = read<Item>(ITEMS_KEY);
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) throw new Error("Item not found.");
  const updated: Item = { ...items[index], ...patch };
  items[index] = updated;
  write(ITEMS_KEY, items);
  return updated;
}

export function clearLocalData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ITEMS_KEY);
  window.localStorage.removeItem(LOGS_KEY);
}

export function clearLocalRawMacros() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RAW_MACROS_KEY);
}

export function clearLocalGoals() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GOALS_KEY);
}

export function clearLocalNotes() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NOTES_KEY);
}

export function clearLocalMovements() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MOVEMENTS_KEY);
  window.localStorage.removeItem(MOVEMENT_LOGS_KEY);
}

export function clearLocalHabits() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HABITS_KEY);
  window.localStorage.removeItem(HABIT_CHECKS_KEY);
}

export const localStore: DataStore = {
  async listItems() {
    // Older locally-stored items predate the `calories` field — backfill from
    // the 4/4/9 formula — and the `staple` flag.
    return read<Item>(ITEMS_KEY).map((item) => ({
      ...item,
      calories: item.calories ?? caloriesFor(item.protein, item.carbs, item.fat),
      staple: item.staple ?? false,
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
      staple: false,
      ...input,
    };
    write(ITEMS_KEY, [...read<Item>(ITEMS_KEY), item]);
    return item;
  },
  async updateItem(itemId: string, input: ItemInput) {
    return patchItem(itemId, input);
  },
  async setItemStaple(itemId: string, staple: boolean) {
    return patchItem(itemId, { staple });
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
  async listRawMacros() {
    return read<RawMacroEntry>(RAW_MACROS_KEY);
  },
  async addRawMacros(input: RawMacroInput, consumedAt?: string) {
    const entry: RawMacroEntry = {
      id: crypto.randomUUID(),
      consumed_at: consumedAt ?? new Date().toISOString(),
      ...input,
    };
    write(RAW_MACROS_KEY, [...read<RawMacroEntry>(RAW_MACROS_KEY), entry]);
    return entry;
  },
  async deleteRawMacros(entryId: string) {
    write(
      RAW_MACROS_KEY,
      read<RawMacroEntry>(RAW_MACROS_KEY).filter((entry) => entry.id !== entryId)
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
  async listMovements() {
    return read<Movement>(MOVEMENTS_KEY).sort((a, b) => a.name.localeCompare(b.name));
  },
  async createMovement(input: MovementInput) {
    const movement: Movement = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };
    write(MOVEMENTS_KEY, [...read<Movement>(MOVEMENTS_KEY), movement]);
    return movement;
  },
  async updateMovement(movementId: string, input: MovementInput) {
    const movements = read<Movement>(MOVEMENTS_KEY);
    const index = movements.findIndex((movement) => movement.id === movementId);
    if (index === -1) throw new Error("Move not found.");
    const updated: Movement = { ...movements[index], ...input };
    movements[index] = updated;
    write(MOVEMENTS_KEY, movements);
    return updated;
  },
  async listMovementLogs() {
    return read<MovementLog>(MOVEMENT_LOGS_KEY);
  },
  async logMovement(movementId: string, amount: number, loggedAt?: string) {
    const log: MovementLog = {
      id: crypto.randomUUID(),
      movement_id: movementId,
      amount,
      logged_at: loggedAt ?? new Date().toISOString(),
    };
    write(MOVEMENT_LOGS_KEY, [...read<MovementLog>(MOVEMENT_LOGS_KEY), log]);
    return log;
  },
  async deleteMovementLog(logId: string) {
    write(
      MOVEMENT_LOGS_KEY,
      read<MovementLog>(MOVEMENT_LOGS_KEY).filter((log) => log.id !== logId)
    );
  },
  async listHabits() {
    return read<Habit>(HABITS_KEY).sort((a, b) => a.name.localeCompare(b.name));
  },
  async createHabit(input: HabitInput) {
    const habits = read<Habit>(HABITS_KEY);
    assertUniqueHabitName(habits, input.name);
    const habit: Habit = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };
    write(HABITS_KEY, [...habits, habit]);
    return habit;
  },
  async updateHabit(habitId: string, input: HabitInput) {
    const habits = read<Habit>(HABITS_KEY);
    const index = habits.findIndex((habit) => habit.id === habitId);
    if (index === -1) throw new Error("Habit not found.");
    assertUniqueHabitName(habits, input.name, habitId);
    const updated: Habit = { ...habits[index], ...input };
    habits[index] = updated;
    write(HABITS_KEY, habits);
    return updated;
  },
  async listHabitChecks() {
    return read<HabitCheck>(HABIT_CHECKS_KEY);
  },
  async addHabitChecks(checks: HabitCheck[]) {
    const existing = read<HabitCheck>(HABIT_CHECKS_KEY);
    const taken = new Set(existing.map((check) => `${check.habit_id}|${check.day}`));
    const added = checks.filter((check) => !taken.has(`${check.habit_id}|${check.day}`));
    write(HABIT_CHECKS_KEY, [...existing, ...added]);
  },
  async removeHabitChecks(day: string, habitIds: string[]) {
    write(
      HABIT_CHECKS_KEY,
      read<HabitCheck>(HABIT_CHECKS_KEY).filter(
        (check) => check.day !== day || !habitIds.includes(check.habit_id)
      )
    );
  },
};
