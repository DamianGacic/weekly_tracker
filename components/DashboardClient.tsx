"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, LogEntry, ItemInput } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { avgDaily, formatWeekLabel, getWeekStart, weekProgress } from "@/lib/week";
import { countLogsByItem, sumMacros, round1 } from "@/lib/macros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemDialog } from "@/components/ItemDialog";
import { WeekLogEditor } from "@/components/WeekLogEditor";

export function DashboardClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    Promise.all([store.listItems(), store.listLogs()]).then(([loadedItems, loadedLogs]) => {
      if (!active) return;
      setItems(loadedItems);
      setLogs(loadedLogs);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [store, status, syncVersion]);

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const now = new Date();

  const thisWeekLogs = useMemo(
    () => logs.filter((log) => new Date(log.consumed_at) >= weekStart),
    [logs, weekStart]
  );
  const counts = useMemo(() => countLogsByItem(thisWeekLogs), [thisWeekLogs]);
  const totals = useMemo(() => sumMacros(items, counts), [items, counts]);

  const progress = weekProgress(weekStart, now);

  const avg = {
    protein: avgDaily(totals.protein, { weekStart, now, isCurrentWeek: true }),
    carbs: avgDaily(totals.carbs, { weekStart, now, isCurrentWeek: true }),
    fat: avgDaily(totals.fat, { weekStart, now, isCurrentWeek: true }),
    calories: avgDaily(totals.calories, { weekStart, now, isCurrentWeek: true }),
  };

  async function handleCreateItem(input: ItemInput) {
    const item = await store.createItem(input);
    setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    return item;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
          <p className="text-xs text-muted-foreground">{formatWeekLabel(weekStart)}</p>
          <WeekProgressBar fraction={progress} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MacroStat label="Protein" value={totals.protein} avg={avg.protein} unit="g" />
          <MacroStat label="Carbs" value={totals.carbs} avg={avg.carbs} unit="g" />
          <MacroStat label="Fat" value={totals.fat} avg={avg.fat} unit="g" />
          <MacroStat label="Calories" value={totals.calories} avg={avg.calories} unit=" kcal" />
        </CardContent>
      </Card>

      <WeekLogEditor
        items={items}
        weekLogs={thisWeekLogs}
        weekStart={weekStart}
        isCurrentWeek
        store={store}
        onLogsChange={setLogs}
        emptyLabel="Nothing logged yet — search above to add your first item."
        actions={<ItemDialog mode="create" onSave={handleCreateItem} />}
      />
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
