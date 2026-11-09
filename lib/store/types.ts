export type Item = {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  /** Offered in the Staples block on This week until it's logged that week. */
  staple: boolean;
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

/** Macros added to a week directly rather than through an item, for exceptions and rare foods. */
export type RawMacroEntry = {
  id: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  consumed_at: string;
};

export type RawMacroInput = Omit<RawMacroEntry, "id" | "consumed_at">;

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

/** One line of a lift's weekly goal: `sets` sets of at least `weight` kg for at least `reps` reps. */
export type LiftGoalLine = {
  sets: number;
  /** In kg; 0 for bodyweight. */
  weight: number;
  reps: number;
};

export type Lift = {
  id: string;
  name: string;
  /** The weekly goal, hardest line first (see `normalizeGoal`); empty for no goal. */
  goal: LiftGoalLine[];
  created_at: string;
};

export type LiftInput = Omit<Lift, "id" | "created_at">;

/** One set of a lift. */
export type LiftSet = {
  id: string;
  lift_id: string;
  /** In kg; 0 for bodyweight. */
  weight: number;
  reps: number;
  logged_at: string;
};

/** Each week's note, keyed by that week's Monday as "YYYY-MM-DD" (see `localDateKey`). */
export type WeekNotes = Record<string, string>;

export type Habit = {
  id: string;
  name: string;
  /** How many days a week to do it, 1–7; null when it has no goal. */
  goal_days: number | null;
  /** Ids of the habits that checking this one also checks on the same day. */
  includes: string[];
  created_at: string;
};

export type HabitInput = Omit<Habit, "id" | "created_at">;

/** A habit done on a day. Days without a check weren't done. */
export type HabitCheck = {
  habit_id: string;
  /** Local calendar date as "YYYY-MM-DD" (see `localDateKey`). */
  day: string;
  /** Checked because a habit that includes it was checked, not by checking it itself. */
  auto: boolean;
};

export interface DataStore {
  listItems(): Promise<Item[]>;
  listLogs(): Promise<LogEntry[]>;
  createItem(input: ItemInput): Promise<Item>;
  updateItem(itemId: string, input: ItemInput): Promise<Item>;
  setItemStaple(itemId: string, staple: boolean): Promise<Item>;
  /**
   * `consumedAt` defaults to now; pass it explicitly to log into a past week.
   * `amount` is in portions and defaults to 1.
   */
  logItem(itemId: string, consumedAt?: string, amount?: number): Promise<LogEntry>;
  deleteLog(logId: string): Promise<void>;
  listRawMacros(): Promise<RawMacroEntry[]>;
  /** `consumedAt` defaults to now; pass it explicitly to add to a past week. */
  addRawMacros(input: RawMacroInput, consumedAt?: string): Promise<RawMacroEntry>;
  deleteRawMacros(entryId: string): Promise<void>;
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
  listLifts(): Promise<Lift[]>;
  createLift(input: LiftInput): Promise<Lift>;
  updateLift(liftId: string, input: LiftInput): Promise<Lift>;
  listLiftSets(): Promise<LiftSet[]>;
  /**
   * Logs `count` identical sets of `weight` kg × `reps`, all at `loggedAt`
   * (default now; pass it explicitly to log into a past week).
   */
  logLiftSets(
    liftId: string,
    set: { weight: number; reps: number },
    count: number,
    loggedAt?: string
  ): Promise<LiftSet[]>;
  deleteLiftSet(setId: string): Promise<void>;
  listHabits(): Promise<Habit[]>;
  createHabit(input: HabitInput): Promise<Habit>;
  updateHabit(habitId: string, input: HabitInput): Promise<Habit>;
  listHabitChecks(): Promise<HabitCheck[]>;
  /** Saves all the checks at once; a habit already checked on that day keeps its check. */
  addHabitChecks(checks: HabitCheck[]): Promise<void>;
  /** Removes the checks of all `habitIds` on `day` at once. */
  removeHabitChecks(day: string, habitIds: string[]): Promise<void>;
}
