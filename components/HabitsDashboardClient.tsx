"use client";

import { useMemo } from "react";
import { useHabitData } from "@/lib/store/useHabitData";
import { formatWeekLabel, getWeekStart, getWeekEnd, localDateKey } from "@/lib/week";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitDialog } from "@/components/HabitDialog";
import { HabitWeek } from "@/components/HabitWeek";
import { goalsReached } from "@/components/HabitHistoryClient";

export function HabitsDashboardClient() {
  const { habits, checks, loading, error, saveError, pendingDays, createHabit, toggle } =
    useHabitData();

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const weekChecks = useMemo(() => {
    const from = localDateKey(weekStart);
    const to = localDateKey(getWeekEnd(weekStart));
    return checks.filter((check) => check.day >= from && check.day < to);
  }, [checks, weekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const reached = goalsReached(habits, weekChecks);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>This week</CardTitle>
            <p className="text-xs text-muted-foreground">{formatWeekLabel(weekStart)}</p>
            {reached && (
              <p className="mt-1 text-xs text-muted-foreground">
                Goals reached: {reached.met} of {reached.total}
              </p>
            )}
          </div>
          <HabitDialog mode="create" habits={habits} onSave={createHabit} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No habits yet — add your first one with New habit, then check it off on each day you
            do it.
          </p>
        ) : (
          <HabitWeek
            habits={habits}
            allHabits={habits}
            weekChecks={weekChecks}
            weekStart={weekStart}
            editable
            pendingDays={pendingDays}
            onToggle={toggle}
          />
        )}
      </CardContent>
    </Card>
  );
}
