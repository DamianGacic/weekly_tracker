import type { LiftGoalLine, LiftSet } from "@/lib/store/types";
import { formatAmount } from "@/lib/number";

/** A set's weight (kg, 0 for bodyweight) and reps, without when it was done. */
export type SetSpec = { weight: number; reps: number };

/** What the − / + buttons next to the weight field change it by, in kg. */
export const WEIGHT_STEP = 2.5;

/** Most sets the set dialog logs in one go, so a typo can't add 100 sets. */
export const MAX_SETS_AT_ONCE = 20;

/**
 * How hard a set is: its estimated one-rep max, by the Epley formula
 * weight × (1 + reps / 30). It weighs extra reps against extra weight, so
 * 100 kg × 6 (≈120) counts as harder than 105 kg × 4 (≈119). Rounded so two
 * sets with the same estimate tie exactly instead of on float noise.
 */
export function hardness({ weight, reps }: SetSpec): number {
  return Math.round(weight * (1 + reps / 30) * 1e6) / 1e6;
}

/**
 * Sort comparator, hardest first: by `hardness`, then the heavier set, then
 * the one with more reps. Bodyweight sets (0 kg) all score 0, so they end up
 * ordered by reps.
 */
export function hardestFirst(a: SetSpec, b: SetSpec): number {
  return hardness(b) - hardness(a) || b.weight - a.weight || b.reps - a.reps;
}

export function sameSpec(a: SetSpec, b: SetSpec): boolean {
  return a.weight === b.weight && a.reps === b.reps;
}

/**
 * Whether `set` counts as one set of the goal line `line`: at least the
 * line's weight and at least its reps. So for a 105 kg × 4 line, 105 × 5,
 * 107.5 × 4 and 110 × 6 all count, but 102.5 × 6 and 105 × 3 don't.
 */
export function meetsLine(set: SetSpec, line: SetSpec): boolean {
  return set.weight >= line.weight && set.reps >= line.reps;
}

/**
 * How many sets of each goal line the week's sets cover, in the goal's own
 * order.
 *
 * Each set counts toward at most one line, and only one it meets (see
 * `meetsLine`). Lines are filled hardest first; a line's set is moved to
 * another line it also meets whenever that lets one more goal set be covered.
 * For example, with lines 100 kg × 3 and 80 kg × 8, the sets 100 × 8 and
 * 100 × 3 cover both lines (100 × 8 goes to the 80 × 8 line), where a plain
 * "first match" would give 100 × 8 to the first line and leave the second
 * empty.
 *
 * Technically a bipartite matching between goal sets and logged sets, grown
 * one goal set at a time along augmenting paths (Kuhn's algorithm). Filled
 * goal sets stay filled as it grows, so trying them hardest first both covers
 * as many goal sets as possible and favours the harder lines when not all of
 * them can be covered.
 */
export function goalProgress(goal: LiftGoalLine[], sets: SetSpec[]): number[] {
  // Candidates tried easiest first, to keep the harder sets free for harder lines.
  const easiestFirst = sets.map((_, i) => i).sort((a, b) => hardestFirst(sets[b], sets[a]));
  const candidates = goal.map((line) => easiestFirst.filter((i) => meetsLine(sets[i], line)));
  const lineOfSet = sets.map(() => -1);
  const done = goal.map(() => 0);

  // Finds a set for one more goal set of `line`, possibly moving other sets around.
  function fill(line: number, visited: boolean[]): boolean {
    for (const set of candidates[line]) {
      if (visited[set]) continue;
      visited[set] = true;
      const current = lineOfSet[set];
      if (current === -1 || fill(current, visited)) {
        lineOfSet[set] = line;
        return true;
      }
    }
    return false;
  }

  const hardestLinesFirst = goal.map((_, i) => i).sort((a, b) => hardestFirst(goal[a], goal[b]));
  for (const line of hardestLinesFirst) {
    // Once one goal set of a line can't be filled, the rest of that line can't either.
    while (done[line] < goal[line].sets && fill(line, sets.map(() => false))) {
      done[line] += 1;
    }
  }
  return done;
}

export function goalSetCount(goal: LiftGoalLine[]): number {
  return goal.reduce((sum, line) => sum + line.sets, 0);
}

export type SetGroup = SetSpec & { count: number };

/** Identical sets (same weight and reps) counted together, hardest first. */
export function groupSets(sets: SetSpec[]): SetGroup[] {
  const groups = new Map<string, SetGroup>();
  for (const { weight, reps } of sets) {
    const key = `${weight}|${reps}`;
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { weight, reps, count: 1 });
  }
  return [...groups.values()].sort(hardestFirst);
}

/** Sets grouped by lift_id. */
export function setsByLift(sets: LiftSet[]): Map<string, LiftSet[]> {
  const byLift = new Map<string, LiftSet[]>();
  for (const set of sets) {
    const group = byLift.get(set.lift_id) ?? [];
    group.push(set);
    byLift.set(set.lift_id, group);
  }
  return byLift;
}

/** Newest first; sets logged together keep their order. */
export function newestFirst(a: LiftSet, b: LiftSet): number {
  return new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime();
}

/** The most recent set of `liftId` logged before `before`, or null if there is none. */
export function lastSetOf(sets: LiftSet[], liftId: string, before: Date): LiftSet | null {
  let last: LiftSet | null = null;
  for (const set of sets) {
    if (set.lift_id !== liftId || new Date(set.logged_at) >= before) continue;
    if (!last || newestFirst(set, last) < 0) last = set;
  }
  return last;
}

/**
 * Merges lines for the same weight × reps and puts the hardest line first, so
 * a saved goal reads the same way the sets are listed.
 */
export function normalizeGoal(goal: LiftGoalLine[]): LiftGoalLine[] {
  const merged = new Map<string, LiftGoalLine>();
  for (const { sets, weight, reps } of goal) {
    const key = `${weight}|${reps}`;
    const line = merged.get(key);
    if (line) line.sets += sets;
    else merged.set(key, { sets, weight, reps });
  }
  return [...merged.values()].sort(hardestFirst);
}

/** A stored goal, keeping only well-formed lines (it arrives as untyped JSON). */
export function goalFromJson(value: unknown): LiftGoalLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { sets, weight, reps } = entry as Record<string, unknown>;
    return isCount(sets) && isCount(reps) && typeof weight === "number" && weight >= 0
      ? [{ sets, weight, reps }]
      : [];
  });
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * A typed weight in kg, with "." or "," as the decimal separator and rounded
 * to 0.01 kg; 0 means bodyweight. NaN for a blank, negative or non-number entry.
 */
export function parseWeight(value: string): number {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

/** A typed whole number of at least 1 (reps or sets); NaN for anything else. */
export function parseCount(value: string): number {
  const trimmed = value.trim();
  const n = Number(trimmed);
  return trimmed !== "" && Number.isInteger(n) && n >= 1 ? n : NaN;
}

/** "105 kg", or "bodyweight" for 0. */
export function formatWeight(weight: number): string {
  return weight === 0 ? "bodyweight" : `${formatAmount(weight)} kg`;
}

/** "105 kg × 4". */
export function formatSet({ weight, reps }: SetSpec): string {
  return `${formatWeight(weight)} × ${reps}`;
}

/** "1 set", "3 sets". */
export function formatSetCount(count: number): string {
  return count === 1 ? "1 set" : `${count} sets`;
}

/** "3 sets of 105 kg × 4". */
export function formatSets(count: number, set: SetSpec): string {
  return `${formatSetCount(count)} of ${formatSet(set)}`;
}
