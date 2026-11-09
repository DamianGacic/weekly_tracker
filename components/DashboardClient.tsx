"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, LogEntry, ItemInput, Goals, RawMacroEntry, WeekNotes } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { avgDaily, formatWeekLabel, getWeekStart, localDateKey, weekProgress } from "@/lib/week";
import { addMacros, portionsByItem, sumMacros, round1 } from "@/lib/macros";
import { NO_GOALS, calorieStatus, goalForWeek, proteinStatus } from "@/lib/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalBar, WeekProgressBar } from "@/components/WeekBars";
import { GoalsCard } from "@/components/GoalsCard";
import { MacroSplitSummary } from "@/components/MacroSplit";
import { WeekNote, withWeekNote } from "@/components/WeekNote";
import { ItemDialog } from "@/components/ItemDialog";
import { WeekLogEditor } from "@/components/WeekLogEditor";
import { LoadWarning } from "@/components/LoadWarning";

export function DashboardClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawMacros, setRawMacros] = useState<RawMacroEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(NO_GOALS);
  const [notes, setNotes] = useState<WeekNotes>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Optional parts that failed to load: shown above the totals, so they're
  // never quietly missing from them.
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    const failed: string[] = [];
    // Goals, notes and raw macros are optional, so failing to load them (e.g.
    // their Supabase migration hasn't been run) shouldn't take the dashboard
    // down; the page says what's missing instead.
    function optional<T>(load: Promise<T>, label: string, fallback: T): Promise<T> {
      return load.catch((err) => {
        console.error(`Could not load ${label}:`, err);
        failed.push(label);
        return fallback;
      });
    }
    Promise.all([
      store.listItems(),
      store.listLogs(),
      optional(store.getGoals(), "goals", NO_GOALS),
      optional(store.listWeekNotes(), "week notes", {} as WeekNotes),
      optional(store.listRawMacros(), "additional raw macros", [] as RawMacroEntry[]),
    ])
      .then(([loadedItems, loadedLogs, loadedGoals, loadedNotes, loadedRawMacros]) => {
        if (!active) return;
        setItems(loadedItems);
        setLogs(loadedLogs);
        setRawMacros(loadedRawMacros);
        setGoals(loadedGoals);
        setNotes(loadedNotes);
        setMissing(failed);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Could not load items or logs:", err);
        if (!active) return;
        setError("Couldn't load your items and logs. Check your connection and reload the page.");
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
  const thisWeekRawMacros = useMemo(
    () => rawMacros.filter((entry) => new Date(entry.consumed_at) >= weekStart),
    [rawMacros, weekStart]
  );
  const portions = useMemo(() => portionsByItem(thisWeekLogs), [thisWeekLogs]);
  const totals = useMemo(
    () => addMacros(sumMacros(items, portions), thisWeekRawMacros),
    [items, portions, thisWeekRawMacros]
  );

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
    // Both goals are saved together, so saving from a form that never got the
    // stored goals would overwrite the one not being edited.
    if (missing.includes("goals")) {
      throw new Error("Your goals couldn't be loaded, so saving now could overwrite them. Reload the page first.");
    }
    setGoals(await store.saveGoals(next));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
      <LoadWarning missing={missing} className="lg:col-span-2" />
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
          weekRawMacros={thisWeekRawMacros}
          weekStart={weekStart}
          isCurrentWeek
          store={store}
          onLogsChange={setLogs}
          onRawMacrosChange={setRawMacros}
          onItemsChange={setItems}
          emptyLabel="Nothing logged yet — search above to add your first item."
          actions={<ItemDialog mode="create" onSave={handleCreateItem} />}
          showStaples
        />
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
