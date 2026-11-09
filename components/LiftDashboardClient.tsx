"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiftData } from "@/lib/store/useLiftData";
import { formatWeekLabel, getWeekStart, weekProgress } from "@/lib/week";
import { goalProgress, goalSetCount, setsByLift } from "@/lib/lifts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeekProgressBar } from "@/components/WeekBars";
import { MovementStat } from "@/components/MovementDashboardClient";
import { LiftDialog } from "@/components/LiftDialog";
import { LiftWeekEditor } from "@/components/LiftWeekEditor";

export function LiftDashboardClient() {
  const { store, lifts, sets, setSets, loading, error, createLift } = useLiftData();

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const progress = weekProgress(weekStart, new Date());

  const weekSets = useMemo(
    () => sets.filter((set) => new Date(set.logged_at) >= weekStart),
    [sets, weekStart]
  );
  const byLift = useMemo(() => setsByLift(weekSets), [weekSets]);

  const withGoals = lifts.filter((lift) => lift.goal.length > 0);
  let goalDone = 0;
  let goalTotal = 0;
  let goalsComplete = 0;
  for (const lift of withGoals) {
    const done = goalProgress(lift.goal, byLift.get(lift.id) ?? []).reduce((sum, n) => sum + n, 0);
    const total = goalSetCount(lift.goal);
    goalDone += done;
    goalTotal += total;
    if (done === total) goalsComplete += 1;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
          <p className="text-xs text-muted-foreground">{formatWeekLabel(weekStart)}</p>
          <WeekProgressBar fraction={progress} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <MovementStat
            label="Sets"
            value={String(weekSets.length)}
            avg={`across ${byLift.size} ${byLift.size === 1 ? "lift" : "lifts"}`}
          />
          {withGoals.length > 0 ? (
            <MovementStat
              label="Goal sets"
              value={`${goalDone} / ${goalTotal}`}
              avg={`${goalsComplete} of ${withGoals.length} ${withGoals.length === 1 ? "goal" : "goals"} complete`}
            />
          ) : (
            lifts.length > 0 && (
              <p className="self-center text-xs text-muted-foreground">
                Add weekly goals to your lifts in{" "}
                <Link href="/lifts/list" className="underline underline-offset-2">
                  Your lifts
                </Link>
                .
              </p>
            )
          )}
        </CardContent>
      </Card>

      <LiftWeekEditor
        lifts={lifts}
        allSets={sets}
        weekSets={weekSets}
        weekStart={weekStart}
        isCurrentWeek
        showGoals
        store={store}
        onSetsChange={setSets}
        emptyLabel={
          lifts.length === 0
            ? "No lifts yet — add your first one with New lift."
            : "Nothing logged this week yet — search above to log a lift."
        }
        actions={<LiftDialog mode="create" onSave={createLift} />}
      />
    </div>
  );
}
