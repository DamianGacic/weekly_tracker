"use client";

import { Check } from "lucide-react";
import type { Habit, HabitCheck } from "@/lib/store/types";
import { habitStatus } from "@/lib/habits";
import { localDateKey, weekDays } from "@/lib/week";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/components/WeekBars";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The day header and every row's boxes share this grid, so the columns line
// up: full width on phones, under the habit's name; a fixed width on the
// right from `sm` up.
const DAY_GRID = "grid w-full grid-cols-7 justify-items-center gap-1 sm:w-64 sm:shrink-0";

/**
 * A week of habits: one row per habit with a box for each day, Monday first.
 * Days after today can't be checked yet.
 */
export function HabitWeek({
  habits,
  allHabits,
  weekChecks,
  weekStart,
  editable,
  pendingDays,
  onToggle,
}: {
  /** The habits to show, in order. */
  habits: Habit[];
  /** Every habit, for naming the habit that checked an included one. */
  allHabits: Habit[];
  /** Checks already filtered down to just this week. */
  weekChecks: HabitCheck[];
  weekStart: Date;
  editable: boolean;
  pendingDays: ReadonlySet<string>;
  onToggle: (habitId: string, day: string) => void;
}) {
  const todayKey = localDateKey(new Date());
  const days = weekDays(weekStart).map((date) => ({ date, key: localDateKey(date) }));
  const checkOf = new Map(weekChecks.map((check) => [`${check.habit_id}|${check.day}`, check]));
  const names = new Map(allHabits.map((habit) => [habit.id, habit.name]));

  /** Why an `auto` check is there: the checked habits that day that directly include it. */
  function autoTitle(habitId: string, day: string): string {
    const by = allHabits
      .filter((h) => h.includes.includes(habitId) && checkOf.has(`${h.id}|${day}`))
      .map((h) => h.name);
    return by.length > 0 ? `Checked with ${by.join(", ")}` : "Checked with another habit";
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex sm:justify-end">
        <div className={DAY_GRID} aria-hidden>
          {days.map(({ date, key }, i) => (
            <div
              key={key}
              className={cn(
                "flex flex-col items-center text-[10px] leading-tight",
                key === todayKey ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              <span>{DAY_NAMES[i]}</span>
              <span>{date.getDate()}</span>
            </div>
          ))}
        </div>
      </div>

      {habits.map((habit) => {
        const done = days.filter(({ key }) => checkOf.has(`${habit.id}|${key}`)).length;
        const openDays = days.filter(
          ({ key }) => key >= todayKey && !checkOf.has(`${habit.id}|${key}`)
        ).length;
        const included = habit.includes.flatMap((id) => names.get(id) ?? []);
        return (
          <div
            key={habit.id}
            className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium">{habit.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {habit.goal_days === null
                    ? `${done} ${done === 1 ? "day" : "days"}`
                    : `${done} / ${habit.goal_days} ${habit.goal_days === 1 ? "day" : "days"}`}
                </span>
              </div>
              {included.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  Includes {included.join(", ")}
                </p>
              )}
              {habit.goal_days !== null && (
                <div
                  role="progressbar"
                  aria-label={`${habit.name} this week`}
                  aria-valuenow={Math.min(done, habit.goal_days)}
                  aria-valuemin={0}
                  aria-valuemax={habit.goal_days}
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      STATUS_COLORS[habitStatus(done, habit.goal_days, openDays)]
                    )}
                    style={{ width: `${Math.min(done / habit.goal_days, 1) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className={DAY_GRID}>
              {days.map(({ date, key }) => {
                const check = checkOf.get(`${habit.id}|${key}`);
                const future = key > todayKey;
                const dayLabel = date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <button
                    key={key}
                    type="button"
                    role="checkbox"
                    aria-checked={check !== undefined}
                    aria-label={`${habit.name}, ${dayLabel}`}
                    title={check?.auto ? autoTitle(habit.id, key) : undefined}
                    disabled={!editable || future || pendingDays.has(key)}
                    onClick={() => onToggle(habit.id, key)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      check
                        ? cn(
                            "border-transparent text-primary-foreground",
                            // Checked through another habit: same check, a lighter fill.
                            check.auto ? "bg-primary/55" : "bg-primary"
                          )
                        : "border-border enabled:hover:bg-muted",
                      !check && key === todayKey && "border-foreground/40",
                      future && "border-dashed opacity-40"
                    )}
                  >
                    {check && <Check className="size-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
