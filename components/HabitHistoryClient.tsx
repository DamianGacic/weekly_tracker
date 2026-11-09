"use client";

import { Fragment, useMemo, useState } from "react";
import type { Habit, HabitCheck } from "@/lib/store/types";
import { useHabitData } from "@/lib/store/useHabitData";
import {
  formatWeekLabel,
  formatWeekRange,
  getWeekEnd,
  getWeekStart,
  parseDateKey,
  weeksBetween,
} from "@/lib/week";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrackingGap } from "@/components/TrackingGap";
import { HabitWeek } from "@/components/HabitWeek";

/** How many of the habits with a goal reached it in a week; null if none has a goal. */
export function goalsReached(
  habits: Habit[],
  weekChecks: HabitCheck[]
): { met: number; total: number } | null {
  const withGoal = habits.filter((habit) => habit.goal_days !== null);
  if (withGoal.length === 0) return null;
  const met = withGoal.filter(
    (habit) => weekChecks.filter((check) => check.habit_id === habit.id).length >= habit.goal_days!
  ).length;
  return { met, total: withGoal.length };
}

export function HabitHistoryClient() {
  const { habits, checks, loading, error, saveError, pendingDays, toggle } = useHabitData();
  const [expandedKey, setExpandedKey] = useState<number | null>(null);

  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);

  const weeks = useMemo(() => {
    const groups = new Map<number, HabitCheck[]>();
    for (const check of checks) {
      const weekStart = getWeekStart(parseDateKey(check.day));
      if (weekStart >= currentWeekStart) continue;
      const group = groups.get(weekStart.getTime()) ?? [];
      group.push(check);
      groups.set(weekStart.getTime(), group);
    }
    // Last week is always shown, even with nothing checked, so a day you
    // forgot (say, last Sunday) can still be checked.
    const lastWeek = new Date(currentWeekStart);
    lastWeek.setDate(lastWeek.getDate() - 7);
    if (habits.length > 0 && !groups.has(lastWeek.getTime())) groups.set(lastWeek.getTime(), []);

    return Array.from(groups.entries())
      .map(([key, weekChecks]) => {
        const weekStart = new Date(key);
        const isLastWeek = key === lastWeek.getTime();
        // A habit shows in the weeks since it was added, and in any week it has
        // checks in. Last week shows every habit, so a new one can be filled in.
        const weekHabits = habits.filter(
          (habit) =>
            isLastWeek ||
            new Date(habit.created_at) < getWeekEnd(weekStart) ||
            weekChecks.some((check) => check.habit_id === habit.id)
        );
        return { weekStart, weekChecks, weekHabits };
      })
      .filter(({ weekHabits }) => weekHabits.length > 0)
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [checks, habits, currentWeekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Past weeks</h1>
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      {weeks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed weeks yet.</p>
      ) : (
        weeks.map(({ weekStart: ws, weekChecks, weekHabits }, i) => {
          const key = ws.getTime();
          // Untracked weeks between this one and the next newer week shown (or this week).
          const gapWeeks = weeksBetween(ws, i === 0 ? currentWeekStart : weeks[i - 1].weekStart);
          const expanded = expandedKey === key;
          const reached = goalsReached(weekHabits, weekChecks);
          return (
            <Fragment key={key}>
              {gapWeeks > 0 && <TrackingGap after={ws} weeks={gapWeeks} />}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{formatWeekRange(ws)}</CardTitle>
                      <p className="text-xs text-muted-foreground">{formatWeekLabel(ws)}</p>
                      {reached && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Goals reached: {reached.met} of {reached.total}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedKey(expanded ? null : key)}
                    >
                      {expanded ? "Done" : "Edit"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <HabitWeek
                    habits={weekHabits}
                    allHabits={habits}
                    weekChecks={weekChecks}
                    weekStart={ws}
                    editable={expanded}
                    pendingDays={pendingDays}
                    onToggle={toggle}
                  />
                </CardContent>
              </Card>
            </Fragment>
          );
        })
      )}
    </div>
  );
}
