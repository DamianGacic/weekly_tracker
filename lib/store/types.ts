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
}
