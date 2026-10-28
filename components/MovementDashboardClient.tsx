"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { MovementKind } from "@/lib/store/types";
import { useMovementData } from "@/lib/store/useMovementData";
import { avgDaily, formatWeekLabel, getWeekStart, weekProgress } from "@/lib/week";
import { goalForWeek, movementStatus } from "@/lib/goals";
import { GOAL_UNITS, formatDuration, totalsByMovement } from "@/lib/movement";
import { round1 } from "@/lib/macros";
import { formatAmount } from "@/lib/number";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalBar, WeekProgressBar } from "@/components/WeekBars";
import { MovementDialog } from "@/components/MovementDialog";
import { MovementLogEditor } from "@/components/MovementLogEditor";

export function MovementDashboardClient() {
  const { store, movements, logs, setLogs, loading, error, createMovement } = useMovementData();

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const now = new Date();
  const progress = weekProgress(weekStart, now);

  const weekLogs = useMemo(
    () => logs.filter((log) => new Date(log.logged_at) >= weekStart),
    [logs, weekStart]
  );
  const totals = useMemo(() => totalsByMovement(weekLogs), [weekLogs]);
  const totalFor = (kind: MovementKind) =>
    movements
      .filter((movement) => movement.kind === kind)
      .reduce((sum, movement) => sum + (totals.get(movement.id) ?? 0), 0);
  const reps = totalFor("reps");
  const seconds = totalFor("time");
  const avg = (total: number) => avgDaily(total, { weekStart, now, isCurrentWeek: true });
  const withGoals = movements.filter((movement) => movement.goal);

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
          {withGoals.map((movement) => {
            const { unit, scale } = GOAL_UNITS[movement.kind];
            const target = goalForWeek(movement.goal!, weekStart);
            const done = totals.get(movement.id) ?? 0;
            return (
              <GoalBar
                key={movement.id}
                label={movement.name}
                emptyLabel="No goal set"
                consumed={done / scale}
                target={target / scale}
                unit={unit}
                progress={progress}
                status={movementStatus(done, target, progress)}
              />
            );
          })}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <MovementStat
            label="Moves"
            value={`${formatAmount(reps)} reps`}
            avg={`${formatAmount(round1(avg(reps)))} reps/day avg`}
          />
          <MovementStat
            label="Positions"
            value={formatDuration(seconds)}
            avg={`${formatDuration(avg(seconds))}/day avg`}
          />
        </CardContent>
        {movements.length > 0 && withGoals.length === 0 && (
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Add weekly goals to your moves in{" "}
              <Link href="/movement/moves" className="underline underline-offset-2">
                Your moves
              </Link>
              .
            </p>
          </CardContent>
        )}
      </Card>

      <MovementLogEditor
        movements={movements}
        weekLogs={weekLogs}
        weekStart={weekStart}
        isCurrentWeek
        store={store}
        onLogsChange={setLogs}
        emptyLabel={
          movements.length === 0
            ? "No moves yet — add your first one with New move, then search for it here to log it."
            : "Nothing logged yet — search above to log a move."
        }
        actions={<MovementDialog mode="create" onSave={createMovement} />}
      />
    </div>
  );
}

export function MovementStat({ label, value, avg }: { label: string; value: string; avg: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{avg}</span>
    </div>
  );
}
