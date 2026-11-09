"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Minus, Plus, SlidersHorizontal } from "lucide-react";
import type { DataStore, Lift, LiftGoalLine, LiftSet } from "@/lib/store/types";
import {
  formatSet,
  formatSetCount,
  goalProgress,
  goalSetCount,
  groupSets,
  lastSetOf,
  setsByLift,
  type SetSpec,
} from "@/lib/lifts";
import { getWeekEnd } from "@/lib/week";
import { useLiftLogger } from "@/lib/store/useLiftLogger";
import { SaveError } from "@/components/SaveError";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LiftSetDialog } from "@/components/LiftSetDialog";
import { ROUND_BUTTON } from "@/components/WeekLogEditor";

/** Goal lines with more sets than this show only the count, not a dot per set. */
const MAX_DOTS = 10;

const HARDEST_FIRST_TITLE =
  "Hardest first, by estimated one-rep max: weight × (1 + reps ÷ 30), so extra reps count against extra weight.";

/**
 * One week's lifts as cards: each with its goal (if `showGoals`), its sets
 * hardest first, and buttons to repeat a set in one tap or log one exactly.
 * Lifts not shown yet are found with the search above them.
 */
export function LiftWeekEditor({
  lifts,
  allSets,
  weekSets,
  weekStart,
  isCurrentWeek,
  showGoals,
  store,
  onSetsChange,
  emptyLabel,
  actions,
}: {
  lifts: Lift[];
  /** Every set of every week, for each lift's last set before this week ends. */
  allSets: LiftSet[];
  /** Sets already filtered down to just this week. */
  weekSets: LiftSet[];
  weekStart: Date;
  isCurrentWeek: boolean;
  /**
   * Show each lift's goal and its progress, and a card for every lift with a
   * goal. Off for past weeks, since a goal may have been changed since then.
   */
  showGoals: boolean;
  store: DataStore;
  /** Updates the full (all-weeks) set list the parent owns. */
  onSetsChange: (updater: (prev: LiftSet[]) => LiftSet[]) => void;
  emptyLabel: string;
  /** Rendered next to the search input, e.g. a "New lift" button. */
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  // Lifts logged from here stay on screen even if all their sets are removed
  // again, so the card (and the rows below it) don't jump away mid-edit.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [dialog, setDialog] = useState<{ lift: Lift; initial: SetSpec | null } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pendingId, saveError, logSets, removeSet } = useLiftLogger({
    store,
    weekSets,
    weekStart,
    isCurrentWeek,
    onSetsChange,
  });

  const weekEnd = getWeekEnd(weekStart);
  const byLift = useMemo(() => setsByLift(weekSets), [weekSets]);
  const lastOf = (lift: Lift) => lastSetOf(allSets, lift.id, weekEnd);
  const hasGoal = (lift: Lift) => showGoals && lift.goal.length > 0;

  // Lifts with a goal first, then the rest; each part by name (`lifts` already is).
  const shown = lifts
    .filter((lift) => hasGoal(lift) || byLift.has(lift.id) || touched.has(lift.id))
    .sort((a, b) => Number(hasGoal(b)) - Number(hasGoal(a)));

  // Clicking outside the search input and its results clears the query.
  useEffect(() => {
    if (query.trim().length === 0) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [query]);

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults =
    trimmedQuery.length === 0
      ? []
      : lifts.filter((lift) => lift.name.toLowerCase().includes(trimmedQuery)).slice(0, 8);

  function log(lift: Lift, spec: SetSpec, count = 1) {
    setTouched((prev) => new Set(prev).add(lift.id));
    logSets(lift.id, spec, count);
  }

  /** Opens the exact-set dialog, starting from the last set, else the goal's hardest line. */
  function openDialog(lift: Lift) {
    const last = lastOf(lift);
    const start = last ?? lift.goal[0] ?? null;
    setDialog({ lift, initial: start && { weight: start.weight, reps: start.reps } });
    setDialogOpen(true);
  }

  const dialogLast = dialog ? lastOf(dialog.lift) : null;

  return (
    <div className="flex flex-col gap-3">
      <SaveError message={saveError} />
      <div ref={containerRef} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search your lifts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {actions}
        </div>

        {searchResults.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-1">
              {searchResults.map((lift) => {
                const last = lastOf(lift);
                return (
                  <div
                    key={lift.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-accent"
                  >
                    {/* One tap repeats the last set; a lift never logged opens the dialog instead. */}
                    <button
                      type="button"
                      onClick={() => (last ? log(lift, last) : openDialog(lift))}
                      disabled={pendingId === lift.id}
                      className="flex min-w-0 flex-1 flex-col items-start text-left disabled:opacity-60"
                    >
                      <span className="font-medium">{lift.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {last ? `+${formatSet(last)} per tap (your last set)` : "No sets yet — tap to log one"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDialog(lift)}
                      disabled={pendingId === lift.id}
                      aria-label={`Log a set of ${lift.name} with exact weight and reps`}
                      title="Log a set with exact weight and reps"
                      className={ROUND_BUTTON}
                    >
                      <SlidersHorizontal className="size-3" />
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        shown.map((lift) => (
          <LiftCard
            key={lift.id}
            lift={lift}
            sets={byLift.get(lift.id) ?? []}
            goal={hasGoal(lift) ? lift.goal : []}
            last={lastOf(lift)}
            pending={pendingId === lift.id}
            onLog={(spec) => log(lift, spec)}
            onRemove={(spec) => removeSet(lift.id, spec)}
            onExact={() => openDialog(lift)}
          />
        ))
      )}

      <LiftSetDialog
        lift={dialog?.lift ?? null}
        initial={dialog?.initial ?? null}
        last={dialogLast}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onLog={(spec, count) => dialog && log(dialog.lift, spec, count)}
      />
    </div>
  );
}

function LiftCard({
  lift,
  sets,
  goal,
  last,
  pending,
  onLog,
  onRemove,
  onExact,
}: {
  lift: Lift;
  /** This lift's sets this week. */
  sets: LiftSet[];
  /** Empty when the goal isn't shown. */
  goal: LiftGoalLine[];
  last: SetSpec | null;
  pending: boolean;
  onLog: (spec: SetSpec) => void;
  onRemove: (spec: SetSpec) => void;
  onExact: () => void;
}) {
  const groups = groupSets(sets);
  const done = goalProgress(goal, sets);
  const goalTotal = goalSetCount(goal);
  const goalDone = done.reduce((sum, n) => sum + n, 0);
  const complete = goal.length > 0 && goalDone === goalTotal;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{lift.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatSetCount(sets.length)}
              {goal.length > 0 && (
                <>
                  {" · "}
                  <span className={cn(complete && "text-green-600 dark:text-green-500")}>
                    goal {goalDone} / {goalTotal}
                    {complete && <Check className="ml-0.5 inline size-3" aria-label="complete" />}
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {last && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => onLog(last)}
                title="Log another set like your last one"
                aria-label={`Log another set of ${formatSet(last)}, same as your last set`}
              >
                <Plus />
                {formatSet(last)}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pending}
              onClick={onExact}
              title="Log sets with exact weight and reps"
              aria-label={`Log sets of ${lift.name} with exact weight and reps`}
            >
              <SlidersHorizontal />
            </Button>
          </div>
        </div>

        {goal.length > 0 && (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Goal this week</span>
            {goal.map((line, i) => (
              <GoalLineRow
                key={`${line.weight}|${line.reps}`}
                line={line}
                done={done[i]}
                pending={pending}
                onLog={() => onLog(line)}
              />
            ))}
          </div>
        )}

        {goal.length > 0 && groups.length > 0 && <Separator />}

        {groups.length > 0 ? (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground" title={HARDEST_FIRST_TITLE}>
              Sets, hardest first
            </span>
            {groups.map((group) => (
              <div
                key={`${group.weight}|${group.reps}`}
                className="flex items-center justify-between gap-2 py-1"
              >
                <span className="tabular-nums">{formatSet(group)}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatSetCount(group.count)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(group)}
                    disabled={pending}
                    aria-label={`Remove a set of ${formatSet(group)}`}
                    title="Remove one of these"
                    className={ROUND_BUTTON}
                  >
                    <Minus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onLog(group)}
                    disabled={pending}
                    aria-label={`Log another set of ${formatSet(group)}`}
                    title="Log another one of these"
                    className={ROUND_BUTTON}
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No sets yet this week.
            {goal.length > 0
              ? " Tap + on a goal line to log that set."
              : last
                ? " Tap the button above to repeat your last set."
                : " Use the sliders button to log your first one."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** "105 kg × 4 ●●○ 2/3 (+)": how much of one goal line is covered, and a tap to log exactly it. */
function GoalLineRow({
  line,
  done,
  pending,
  onLog,
}: {
  line: LiftGoalLine;
  done: number;
  pending: boolean;
  onLog: () => void;
}) {
  const complete = done >= line.sets;
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="tabular-nums">{formatSet(line)}</span>
      <div className="flex shrink-0 items-center gap-2">
        {line.sets <= MAX_DOTS && (
          <span aria-hidden className="flex gap-1">
            {Array.from({ length: line.sets }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "size-2 rounded-full",
                  i < done
                    ? complete
                      ? "bg-green-500"
                      : "bg-foreground/70"
                    : "border border-foreground/30"
                )}
              />
            ))}
          </span>
        )}
        <span
          className={cn(
            "w-9 text-right text-xs tabular-nums",
            complete ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
          )}
          aria-label={`${done} of ${line.sets} sets done`}
        >
          {done}/{line.sets}
        </span>
        <button
          type="button"
          onClick={onLog}
          disabled={pending}
          aria-label={`Log a set of ${formatSet(line)}`}
          title={`Log ${formatSet(line)}`}
          className={ROUND_BUTTON}
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}
