"use client";

import type { Habit } from "@/lib/store/types";
import { useHabitData } from "@/lib/store/useHabitData";
import { formatGoalDays } from "@/lib/habits";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HabitDialog } from "@/components/HabitDialog";

export function HabitsListClient() {
  const { habits, loading, error, createHabit, updateHabit } = useHabitData();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your habits</h1>
        <HabitDialog mode="create" habits={habits} onSave={createHabit} />
      </div>
      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No habits yet — add your first one above. A habit can include others, e.g. “Morning
          routine” including “Meditate” and “Stretch”: checking it checks them too.
        </p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-1">
            {habits.map((habit, i) => (
              <div key={habit.id}>
                {i > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">{habit.name}</span>
                    <span className="text-xs text-muted-foreground">{summary(habit, habits)}</span>
                  </div>
                  <HabitDialog
                    mode="edit"
                    habit={habit}
                    habits={habits}
                    onSave={(input) => updateHabit(habit.id, input)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function summary(habit: Habit, habits: Habit[]): string {
  const name = (id: string) => habits.find((h) => h.id === id)?.name ?? [];
  const parts = [habit.goal_days === null ? "no weekly goal" : formatGoalDays(habit.goal_days)];
  const includes = habit.includes.flatMap(name);
  if (includes.length > 0) parts.push(`includes ${includes.join(", ")}`);
  const includedIn = habits.filter((h) => h.includes.includes(habit.id)).map((h) => h.name);
  if (includedIn.length > 0) parts.push(`part of ${includedIn.join(", ")}`);
  return parts.join(" · ");
}
