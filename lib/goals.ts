import type { Goal, Goals } from "@/lib/store/types";

export const NO_GOALS: Goals = { protein: null, calories: null };

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Bar color for a goal's progress so far this week. */
export type GoalStatus = "green" | "yellow" | "red";

/**
 * The goal's target for the week starting `weekStart`: `value` for its
 * anchor week, then `step` applied once per week since — a flat amount, or a
 * percentage of the previous week's value (so percent steps compound).
 */
export function goalForWeek(goal: Goal, weekStart: Date): number {
  // Rounded so a DST change between the two Mondays can't knock it off by one.
  const weeks = Math.max(
    0,
    Math.round((weekStart.getTime() - new Date(goal.anchorWeek).getTime()) / MS_PER_WEEK)
  );
  const target =
    goal.stepMode === "percent"
      ? goal.value * Math.pow(1 + goal.step / 100, weeks)
      : goal.value + goal.step * weeks;
  return Math.max(0, target);
}

/**
 * Calories are a limit, judged against the limit's pro-rata share for the
 * part of the week that has elapsed: green below 80% of that share, yellow
 * from 80–100%, red past it.
 */
export function calorieStatus(consumed: number, weeklyLimit: number, progress: number): GoalStatus {
  const expected = weeklyLimit * progress;
  if (consumed > expected) return "red";
  if (consumed > 0 && consumed >= expected * 0.8) return "yellow";
  return "green";
}

/**
 * Protein is a target: green once the whole weekly goal is reached. Until
 * then it's judged against the goal's pro-rata share for the part of the
 * week that has elapsed: red when more than 25% behind it, yellow otherwise
 * (close to it or ahead).
 */
export function proteinStatus(consumed: number, weeklyGoal: number, progress: number): GoalStatus {
  if (consumed > 0 && consumed >= weeklyGoal) return "green";
  return consumed < weeklyGoal * progress * 0.75 ? "red" : "yellow";
}

/** Movement goals are targets too, judged the same way as protein. */
export const movementStatus = proteinStatus;
