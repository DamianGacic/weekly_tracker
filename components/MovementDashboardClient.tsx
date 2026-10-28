"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { MovementKind } from "@/lib/store/types";
import { useMovementData } from "@/lib/store/useMovementData";
import { useMovementLogger } from "@/lib/store/useMovementLogger";
import { avgDaily, formatWeekLabel, getWeekStart, weekProgress } from "@/lib/week";
import { goalForWeek, movementStatus } from "@/lib/goals";
import {
  KINDS,
  GOAL_UNITS,
  KIND_LABELS,
  formatDuration,
  formatMovementAmount,
  totalsByMovement,
} from "@/lib/movement";
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
  const { pendingId, logMovement } = useMovementLogger({
    store,
    weekLogs,
    weekStart,
    isCurrentWeek: true,
    onLogsChange: setLogs,
  });

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
          {KINDS.map((kind) => {
            const goals = withGoals.filter((movement) => movement.kind === kind);
            if (goals.length === 0) return null;
            return (
              <div key={kind} className="mt-3 flex flex-col">
                <span className="text-xs font-medium">{KIND_LABELS[kind].many}</span>
                {goals.map((movement) => {
                  const { unit, scale } = GOAL_UNITS[movement.kind];
                  const target = goalForWeek(movement.goal!, weekStart);
                  const done = totals.get(movement.id) ?? 0;
                  const perTap = formatMovementAmount(movement.kind, movement.default_amount);
                  return (
                    // Tapping a goal logs one tap's worth, same as its row in the list below.
                    <div
                      key={movement.id}
                      className="relative -mx-2 rounded-md px-2 pb-1.5 hover:bg-accent has-disabled:opacity-60"
                    >
                      <GoalBar
                        label={movement.name}
                        hint={`+${perTap}`}
                        emptyLabel="No goal set"
                        consumed={done / scale}
                        target={target / scale}
                        unit={unit}
                        progress={progress}
                        status={movementStatus(done, target, progress)}
                      />
                      <button
                        type="button"
                        onClick={() => logMovement(movement.id, movement.default_amount)}
                        disabled={pendingId === movement.id}
                        aria-label={`Log ${perTap} of ${movement.name}`}
                        title={`Log ${perTap}`}
                        className="absolute inset-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>
                  );
                })}
              </div>
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
