"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, LogEntry, ItemInput, Goals, WeekNotes } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { avgDaily, formatWeekLabel, getWeekStart, localDateKey, weekProgress } from "@/lib/week";
import { portionsByItem, sumMacros, round1 } from "@/lib/macros";
import {
  NO_GOALS,
  calorieStatus,
  goalForWeek,
  proteinStatus,
  type GoalStatus,
} from "@/lib/goals";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalsCard } from "@/components/GoalsCard";
import { MacroSplitSummary } from "@/components/MacroSplit";
import { WeekNote, withWeekNote } from "@/components/WeekNote";
import { ItemDialog } from "@/components/ItemDialog";
import { WeekLogEditor } from "@/components/WeekLogEditor";

export function DashboardClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(NO_GOALS);
  const [notes, setNotes] = useState<WeekNotes>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    Promise.all([
      store.listItems(),
      store.listLogs(),
      // Goals are optional, so failing to load them (e.g. the Supabase
      // migration for them hasn't been run) shouldn't take the dashboard down.
      store.getGoals().catch((err) => {
        console.error("Could not load goals:", err);
        return NO_GOALS;
      }),
      // Same for notes.
      store.listWeekNotes().catch((err) => {
        console.error("Could not load week notes:", err);
        return {};
      }),
    ]).then(([loadedItems, loadedLogs, loadedGoals, loadedNotes]) => {
      if (!active) return;
      setItems(loadedItems);
      setLogs(loadedLogs);
      setGoals(loadedGoals);
      setNotes(loadedNotes);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [store, status, syncVersion]);

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const weekKey = localDateKey(weekStart);
  const now = new Date();

  const thisWeekLogs = useMemo(
    () => logs.filter((log) => new Date(log.consumed_at) >= weekStart),
    [logs, weekStart]
  );
  const portions = useMemo(() => portionsByItem(thisWeekLogs), [thisWeekLogs]);
  const totals = useMemo(() => sumMacros(items, portions), [items, portions]);

  const progress = weekProgress(weekStart, now);

  const avg = {
    protein: avgDaily(totals.protein, { weekStart, now, isCurrentWeek: true }),
    carbs: avgDaily(totals.carbs, { weekStart, now, isCurrentWeek: true }),
    fat: avgDaily(totals.fat, { weekStart, now, isCurrentWeek: true }),
    calories: avgDaily(totals.calories, { weekStart, now, isCurrentWeek: true }),
  };

  const calorieLimit = goals.calories ? goalForWeek(goals.calories, weekStart) : null;
  const proteinGoal = goals.protein ? goalForWeek(goals.protein, weekStart) : null;

  async function handleCreateItem(input: ItemInput) {
    const item = await store.createItem(input);
    setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    return item;
  }

  async function handleSaveGoals(next: Goals) {
    setGoals(await store.saveGoals(next));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
      <GoalsCard goals={goals} weekStart={weekStart} onSave={handleSaveGoals} />

      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <p className="text-xs text-muted-foreground">{formatWeekLabel(weekStart)}</p>
            <WeekProgressBar fraction={progress} />
            <GoalBar
              label="Calories"
              emptyLabel="No limit set"
              consumed={totals.calories}
              target={calorieLimit}
              unit=" kcal"
              progress={progress}
              status={
                calorieLimit === null ? null : calorieStatus(totals.calories, calorieLimit, progress)
              }
            />
            <GoalBar
              label="Protein"
              emptyLabel="No goal set"
              consumed={totals.protein}
              target={proteinGoal}
              unit="g"
              progress={progress}
              status={
                proteinGoal === null ? null : proteinStatus(totals.protein, proteinGoal, progress)
              }
            />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MacroStat label="Protein" value={totals.protein} avg={avg.protein} unit="g" />
            <MacroStat label="Carbs" value={totals.carbs} avg={avg.carbs} unit="g" />
            <MacroStat label="Fat" value={totals.fat} avg={avg.fat} unit="g" />
            <MacroStat label="Calories" value={totals.calories} avg={avg.calories} unit=" kcal" />
          </CardContent>
          <CardContent>
            <MacroSplitSummary macros={totals} />
          </CardContent>
          <CardContent>
            <WeekNote
              weekKey={weekKey}
              note={notes[weekKey] ?? ""}
              store={store}
              onSaved={(key, note) => setNotes((prev) => withWeekNote(prev, key, note))}
            />
          </CardContent>
        </Card>

        <WeekLogEditor
          items={items}
          weekLogs={thisWeekLogs}
          weekStart={weekStart}
          isCurrentWeek
          store={store}
          onLogsChange={setLogs}
          onItemsChange={setItems}
          emptyLabel="Nothing logged yet — search above to add your first item."
          actions={<ItemDialog mode="create" onSave={handleCreateItem} />}
        />
      </div>
    </div>
  );
}

// Every 12h across the week, Mon 00:00 through the following Mon 00:00.
const WEEK_MARKERS = [
  "Mon", "12pm", "Tue", "12pm", "Wed", "12pm", "Thu",
  "12pm", "Fri", "12pm", "Sat", "12pm", "Sun", "12pm", "Mon",
];

function WeekProgressBar({ fraction }: { fraction: number }) {
  const percent = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  return (
    <div className="mt-1.5">
      <div
        role="progressbar"
        aria-label="Portion of the week elapsed"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        title={`${percent}% of the week elapsed`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1 flex justify-between">
        {WEEK_MARKERS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="h-1 w-px bg-border" />
            <span className="text-[9px] leading-none whitespace-nowrap text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<GoalStatus, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

/**
 * Same size and scale as the week bar: full = the whole weekly goal, so its
 * fill lines up against how much of the week has passed. The tick marks the
 * pro-rata share for right now.
 */
function GoalBar({
  label,
  emptyLabel,
  consumed,
  target,
  unit,
  progress,
  status,
}: {
  label: string;
  emptyLabel: string;
  consumed: number;
  target: number | null;
  unit: string;
  progress: number;
  status: GoalStatus | null;
}) {
  const fraction = target === null ? 0 : target > 0 ? Math.min(consumed / target, 1) : consumed > 0 ? 1 : 0;
  const percent = Math.round(fraction * 100);
  const pacePercent = Math.min(Math.max(progress, 0), 1) * 100;
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        {target === null ? (
          <span className="text-muted-foreground">{emptyLabel}</span>
        ) : (
          <span>
            {round1(consumed)} / {round1(target)}
            {unit}
          </span>
        )}
      </div>
      <div className="relative">
        <div
          role="progressbar"
          aria-label={`${label} so far this week`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          title={
            target === null
              ? undefined
              : `${round1(target * progress)}${unit} would be right on pace by now`
          }
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          {status && (
            <div
              className={cn("h-full rounded-full", STATUS_COLORS[status])}
              style={{ width: `${fraction * 100}%` }}
            />
          )}
        </div>
        {target !== null && (
          <span
            aria-hidden
            className="absolute -top-0.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60"
            style={{ left: `${pacePercent}%` }}
          />
        )}
      </div>
    </div>
  );
}

function MacroStat({
  label,
  value,
  avg,
  unit,
}: {
  label: string;
  value: number;
  avg: number;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">
        {round1(value)}
        {unit}
      </span>
      <span className="text-xs text-muted-foreground">
        {round1(avg)}
        {unit}/day avg
      </span>
    </div>
  );
}
