import type { GoalStatus } from "@/lib/goals";
import type { Habit, HabitCheck } from "@/lib/store/types";

/**
 * Every habit `habitId` includes, directly or through the habits it includes,
 * never counting itself. Ids of habits that no longer exist are skipped.
 */
export function includedHabitIds(habits: Habit[], habitId: string): Set<string> {
  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  const found = new Set<string>();
  const pending = [...(byId.get(habitId)?.includes ?? [])];
  while (pending.length > 0) {
    const id = pending.pop()!;
    const habit = byId.get(id);
    // Also guards against a circle, should one ever have been saved.
    if (id === habitId || found.has(id) || !habit) continue;
    found.add(id);
    pending.push(...habit.includes);
  }
  return found;
}

/**
 * Habits that include `habitId`, directly or indirectly. `habitId` can't
 * include any of them: checking it would then go round in a circle.
 */
export function habitsIncluding(habits: Habit[], habitId: string): Set<string> {
  return new Set(
    habits
      .filter((habit) => habit.id !== habitId && includedHabitIds(habits, habit.id).has(habitId))
      .map((habit) => habit.id)
  );
}

export type CheckChanges = { add: HabitCheck[]; remove: HabitCheck[] };

/**
 * What tapping `habitId` on `day` changes, given that day's checks.
 *
 * Checking a habit also checks every habit it includes (directly or through
 * others) that isn't checked yet; those checks are marked `auto`.
 *
 * Unchecking a habit removes its check, then every `auto` check left without
 * a checked habit that directly includes it, over and over until none is
 * left, so a whole chain unwinds. Checks that were made by tapping the habit
 * itself are never removed this way, and an `auto` check stays as long as
 * another checked habit still includes it.
 */
export function toggleHabit(
  habits: Habit[],
  dayChecks: HabitCheck[],
  habitId: string,
  day: string
): CheckChanges {
  const checked = new Map(dayChecks.map((check) => [check.habit_id, check]));
  const own = checked.get(habitId);

  if (!own) {
    const add: HabitCheck[] = [{ habit_id: habitId, day, auto: false }];
    for (const id of includedHabitIds(habits, habitId)) {
      if (!checked.has(id)) add.push({ habit_id: id, day, auto: true });
    }
    return { add, remove: [] };
  }

  const includes = new Map(habits.map((habit) => [habit.id, habit.includes]));
  const remove: HabitCheck[] = [own];
  checked.delete(habitId);
  for (;;) {
    const orphan = [...checked.values()].find(
      (check) =>
        check.auto &&
        ![...checked.keys()].some((id) => includes.get(id)?.includes(check.habit_id))
    );
    if (!orphan) return { add: [], remove };
    remove.push(orphan);
    checked.delete(orphan.habit_id);
  }
}

/**
 * A weekly habit goal: green once reached, red once it can't be reached any
 * more because too few days are left, yellow while it still can be.
 * `openDays`: days left this week (today included) on which it isn't checked
 * yet; 0 for a past week.
 */
export function habitStatus(done: number, goalDays: number, openDays: number): GoalStatus {
  if (done >= goalDays) return "green";
  return goalDays - done > openDays ? "red" : "yellow";
}

/** "every day", "5 days a week", "1 day a week". */
export function formatGoalDays(goalDays: number): string {
  if (goalDays === 7) return "every day";
  return `${goalDays} ${goalDays === 1 ? "day" : "days"} a week`;
}
