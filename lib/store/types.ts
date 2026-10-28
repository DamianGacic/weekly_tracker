export type Item = {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  created_at: string;
};

export type LogEntry = {
  id: string;
  item_id: string;
  consumed_at: string;
  /** Portions of the item this log stands for: 1 per tap, or e.g. 0.5 for half a portion. */
  amount: number;
};

export type ItemInput = {
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
};

export type GoalStepMode = "flat" | "percent";

/** A weekly target that carries over from week to week, optionally changing by `step` each week. */
export type Goal = {
  /** The target for `anchorWeek`. */
  value: number;
  /** ISO timestamp of the Monday 00:00 that `value` applies to. */
  anchorWeek: string;
  /** Change applied once per week after `anchorWeek`: negative decreases, 0 keeps it constant. */
  step: number;
  /** "flat": `step` is in the goal's own unit; "percent": `step` is a % of the previous week's value. */
  stepMode: GoalStepMode;
};

export type Goals = {
  /** Weekly protein to reach, in grams. */
  protein: Goal | null;
  /** Weekly calories to stay under, in kcal. */
  calories: Goal | null;
};

/** "reps": a move, counted in repetitions. "time": a position, held for a number of seconds. */
export type MovementKind = "reps" | "time";

export type Movement = {
  id: string;
  name: string;
  kind: MovementKind;
  /** What one tap logs: reps, or seconds for a position. */
  default_amount: number;
  /** Optional weekly target, in the same units as the movement's logs. */
  goal: Goal | null;
  created_at: string;
};

export type MovementInput = Omit<Movement, "id" | "created_at">;

export type MovementLog = {
  id: string;
  movement_id: string;
  /** Reps, or seconds for a position. */
  amount: number;
  logged_at: string;
};

/** Each week's note, keyed by that week's Monday as "YYYY-MM-DD" (see `localDateKey`). */
export type WeekNotes = Record<string, string>;

export interface DataStore {
  listItems(): Promise<Item[]>;
  listLogs(): Promise<LogEntry[]>;
  createItem(input: ItemInput): Promise<Item>;
  updateItem(itemId: string, input: ItemInput): Promise<Item>;
  /**
   * `consumedAt` defaults to now; pass it explicitly to log into a past week.
   * `amount` is in portions and defaults to 1.
   */
  logItem(itemId: string, consumedAt?: string, amount?: number): Promise<LogEntry>;
  deleteLog(logId: string): Promise<void>;
  getGoals(): Promise<Goals>;
  saveGoals(goals: Goals): Promise<Goals>;
  listWeekNotes(): Promise<WeekNotes>;
  /** Saves the note for the week keyed `weekKey`; a blank note removes it. */
  saveWeekNote(weekKey: string, note: string): Promise<void>;
  listMovements(): Promise<Movement[]>;
  createMovement(input: MovementInput): Promise<Movement>;
  updateMovement(movementId: string, input: MovementInput): Promise<Movement>;
  listMovementLogs(): Promise<MovementLog[]>;
  /** `loggedAt` defaults to now; pass it explicitly to log into a past week. */
  logMovement(movementId: string, amount: number, loggedAt?: string): Promise<MovementLog>;
  deleteMovementLog(logId: string): Promise<void>;
}
