"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Hash, Minus, Timer } from "lucide-react";
import type { Movement, MovementKind } from "@/lib/store/types";
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
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalBar, WeekProgressBar } from "@/components/WeekBars";
import { MovementAmountDialog } from "@/components/MovementAmountDialog";
import { MovementDialog } from "@/components/MovementDialog";
import { MovementLogEditor } from "@/components/MovementLogEditor";
import { ROUND_BUTTON } from "@/components/WeekLogEditor";

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
  // Moves with a goal are logged from their goal display; the rest from the list below.
  const withGoals = movements.filter((movement) => movement.goal);
  const withoutGoals = movements.filter((movement) => !movement.goal);
  const { pendingId, logMovement, unlogMovement } = useMovementLogger({
    store,
    weekLogs,
    weekStart,
    isCurrentWeek: true,
    onLogsChange: setLogs,
  });
  const [customMovement, setCustomMovement] = useState<Movement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

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
                {goals.map((movement) => (
                  <GoalRow
                    key={movement.id}
                    movement={movement}
                    done={totals.get(movement.id) ?? 0}
                    target={goalForWeek(movement.goal!, weekStart)}
                    progress={progress}
                    pending={pendingId === movement.id}
                    onAdd={() => logMovement(movement.id, movement.default_amount)}
                    onSubtract={() => unlogMovement(movement.id)}
                    onCustom={() => {
                      setCustomMovement(movement);
                      setCustomOpen(true);
                    }}
                  />
                ))}
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
        movements={withoutGoals}
        weekLogs={weekLogs}
        weekStart={weekStart}
        isCurrentWeek
        store={store}
        onLogsChange={setLogs}
        emptyLabel={
          movements.length === 0
            ? "No moves yet — add your first one with New move."
            : withoutGoals.length === 0
              ? "All your moves have a weekly goal, so they're logged from the goals above."
              : "Moves without a goal: search above to log one."
        }
        actions={<MovementDialog mode="create" onSave={createMovement} />}
      />

      <MovementAmountDialog
        movement={customMovement}
        open={customOpen}
        onOpenChange={setCustomOpen}
        onLog={(amount) => customMovement && logMovement(customMovement.id, amount)}
      />
    </div>
  );
}

/**
 * A goal's progress bar, which also logs: tapping it adds one tap's worth,
 * like a row in the list, and it has the same undo and custom-amount buttons.
 */
function GoalRow({
  movement,
  done,
  target,
  progress,
  pending,
  onAdd,
  onSubtract,
  onCustom,
}: {
  movement: Movement;
  /** Amount logged this week, in stored units (reps or seconds). */
  done: number;
  /** This week's goal, in stored units. */
  target: number;
  progress: number;
  pending: boolean;
  onAdd: () => void;
  onSubtract: () => void;
  onCustom: () => void;
}) {
  const { unit, scale } = GOAL_UNITS[movement.kind];
  const perTap = formatMovementAmount(movement.kind, movement.default_amount);
  const CustomIcon = movement.kind === "time" ? Timer : Hash;
  return (
    <div className="-mx-2 flex items-center gap-2 rounded-md px-2 pb-1.5 hover:bg-accent">
      <div className="relative min-w-0 flex-1 has-disabled:opacity-60">
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
          onClick={onAdd}
          disabled={pending}
          aria-label={`Log ${perTap} of ${movement.name}`}
          title={`Log ${perTap}`}
          className="absolute inset-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-2">
        {/* Kept in place while hidden, so every goal bar has the same width. */}
        <button
          type="button"
          onClick={onSubtract}
          disabled={pending || done === 0}
          aria-hidden={done === 0}
          tabIndex={done === 0 ? -1 : undefined}
          aria-label={`Undo the last ${movement.name} you logged`}
          className={cn(ROUND_BUTTON, done === 0 && "invisible")}
        >
          <Minus className="size-3" />
        </button>
        <button
          type="button"
          onClick={onCustom}
          disabled={pending}
          aria-label={`Log a custom amount of ${movement.name}`}
          title="Log a custom amount"
          className={ROUND_BUTTON}
        >
          <CustomIcon className="size-3" />
        </button>
      </div>
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
