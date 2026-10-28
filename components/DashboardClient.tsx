"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, LogEntry, ItemInput, Goals, WeekNotes } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { avgDaily, formatWeekLabel, getWeekStart, localDateKey, weekProgress } from "@/lib/week";
import { portionsByItem, sumMacros, round1 } from "@/lib/macros";
import { NO_GOALS, calorieStatus, goalForWeek, proteinStatus } from "@/lib/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalBar, WeekProgressBar } from "@/components/WeekBars";
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
