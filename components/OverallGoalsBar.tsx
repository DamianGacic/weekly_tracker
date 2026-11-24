"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Target } from "lucide-react";
import type { DataStore } from "@/lib/store/types";
import { useAuth, storeFor, STORE_CHANGE_EVENT } from "@/lib/store/AuthProvider";
import { getWeekStart, weekProgress } from "@/lib/week";
import { goalForWeek, movementStatus } from "@/lib/goals";
import { addMacros, portionsByItem, sumMacros } from "@/lib/macros";
import { totalsByMovement } from "@/lib/movement";
import { goalProgress, goalSetCount, setsByLift } from "@/lib/lifts";
import { GoalBar } from "@/components/WeekBars";
import { cn } from "@/lib/utils";

// ---- On/off setting, kept in localStorage and shared by the toggle and the bar. ----

const SETTING_KEY = "weekly:overall-bar";
const SETTING_EVENT = "weekly:overall-bar-change";

function readSetting(): boolean {
  try {
    return localStorage.getItem(SETTING_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribeSetting(onChange: () => void) {
  window.addEventListener(SETTING_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SETTING_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useOverallBarSetting(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribeSetting, readSetting, () => true);
  function set(next: boolean) {
    try {
      localStorage.setItem(SETTING_KEY, next ? "on" : "off");
    } catch {
      // Private mode etc.: the toggle just won't be remembered.
    }
    window.dispatchEvent(new Event(SETTING_EVENT));
  }
  return [on, set];
}

/** Header button that shows or hides the overall goals bar. */
export function OverallBarToggle() {
  const [on, setOn] = useOverallBarSetting();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setOn(!on)}
      title={on ? "Hide overall goal progress" : "Show overall goal progress"}
      aria-label="Overall goal progress"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        on ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Target className="size-4" />
    </button>
  );
}

// ---- Progress across every goal to reach (protein, moves, lifts). ----

type GoalShare = { section: "Protein" | "Movement" | "Lifts"; fraction: number };

/** Each target-type goal's share done this week (0..1, capped), Calories left out since it's a limit. */
async function loadGoalShares(store: DataStore, weekStart: Date): Promise<GoalShare[]> {
  const inWeek = (iso: string) => new Date(iso) >= weekStart;
  // Each part is optional: one failing to load leaves the rest standing.
  const safe = <T,>(load: Promise<T>, fallback: T) =>
    load.catch((err) => {
      console.error("Overall goals: could not load part of the data:", err);
      return fallback;
    });

  const [goals, items, logs, rawMacros, movements, movementLogs, lifts, liftSets] =
    await Promise.all([
      safe(store.getGoals(), { protein: null, calories: null }),
      safe(store.listItems(), []),
      safe(store.listLogs(), []),
      safe(store.listRawMacros(), []),
      safe(store.listMovements(), []),
      safe(store.listMovementLogs(), []),
      safe(store.listLifts(), []),
      safe(store.listLiftSets(), []),
    ]);

  const shares: GoalShare[] = [];
  const share = (done: number, target: number) => (target > 0 ? Math.min(done / target, 1) : 1);

  if (goals.protein) {
    const weekLogs = logs.filter((log) => inWeek(log.consumed_at));
    const weekRaw = rawMacros.filter((entry) => inWeek(entry.consumed_at));
    const protein = addMacros(sumMacros(items, portionsByItem(weekLogs)), weekRaw).protein;
    shares.push({ section: "Protein", fraction: share(protein, goalForWeek(goals.protein, weekStart)) });
  }

  const moveTotals = totalsByMovement(movementLogs.filter((log) => inWeek(log.logged_at)));
  for (const movement of movements) {
    if (!movement.goal) continue;
    shares.push({
      section: "Movement",
      fraction: share(moveTotals.get(movement.id) ?? 0, goalForWeek(movement.goal, weekStart)),
    });
  }

  const byLift = setsByLift(liftSets.filter((set) => inWeek(set.logged_at)));
  for (const lift of lifts) {
    if (lift.goal.length === 0) continue;
    const done = goalProgress(lift.goal, byLift.get(lift.id) ?? []).reduce((a, b) => a + b, 0);
    shares.push({ section: "Lifts", fraction: share(done, goalSetCount(lift.goal)) });
  }
  return shares;
}

/**
 * One bar for how far along every weekly goal to reach is, across sections:
 * each goal's share done (capped at 100%), averaged so every goal counts the
 * same. Reloads whenever anything is saved, so it follows logging on any page.
 */
export function OverallGoalsBar() {
  const [on] = useOverallBarSetting();
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);
  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const [shares, setShares] = useState<GoalShare[] | null>(null);

  useEffect(() => {
    if (!on || status === "loading") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () =>
      loadGoalShares(store, weekStart).then((loaded) => {
        if (active) setShares(loaded);
      });
    reload();
    // Taps come in bursts, so wait for a quiet moment before reloading.
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 600);
    };
    window.addEventListener(STORE_CHANGE_EVENT, onChange);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener(STORE_CHANGE_EVENT, onChange);
    };
  }, [on, store, status, syncVersion, weekStart]);

  if (!on || !shares || shares.length === 0) return null;

  const overall = shares.reduce((sum, s) => sum + s.fraction, 0) / shares.length;
  const complete = shares.filter((s) => s.fraction >= 1).length;
  const progress = weekProgress(weekStart, new Date());
  const sections = (["Protein", "Movement", "Lifts"] as const)
    .map((section) => {
      const own = shares.filter((s) => s.section === section);
      if (own.length === 0) return null;
      const pct = Math.round((own.reduce((sum, s) => sum + s.fraction, 0) / own.length) * 100);
      return `${section} ${pct}%`;
    })
    .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6 lg:max-w-4xl">
      <GoalBar
        label="All goals this week"
        hint={`${complete} of ${shares.length} complete`}
        emptyLabel="No goals set"
        consumed={overall}
        target={1}
        unit=""
        progress={progress}
        status={movementStatus(overall, 1, progress)}
        valueLabel={`${Math.round(overall * 100)}%`}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{sections.join(" · ")}</p>
    </div>
  );
}
