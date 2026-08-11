"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, LogEntry, ItemInput } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { avgDaily, getWeekStart, weekProgress } from "@/lib/week";
import { countLogsByItem, sumMacros, round1 } from "@/lib/macros";
import { nextTempId } from "@/lib/tempId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NewItemDialog } from "@/components/NewItemDialog";
import { Minus } from "lucide-react";

export function DashboardClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  const loggedItems = items
    .filter((item) => (counts.get(item.id) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

  const searchResults =
    query.trim().length === 0
      ? []
      : items
          .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 8);

  async function logItem(itemId: string) {
    setPendingId(itemId);
    const tempId = nextTempId();
    const optimisticLog: LogEntry = {
      id: tempId,
      item_id: itemId,
      consumed_at: new Date().toISOString(),
    };
    setLogs((prev) => [...prev, optimisticLog]);

    try {
      const log = await store.logItem(itemId);
      setLogs((prev) => prev.map((l) => (l.id === tempId ? log : l)));
    } catch {
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
    }
    setPendingId(null);
  }

  async function unlogItem(itemId: string) {
    const mostRecent = thisWeekLogs
      .filter((log) => log.item_id === itemId)
      .sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime())[0];
    if (!mostRecent) return;

    setPendingId(itemId);
    setLogs((prev) => prev.filter((l) => l.id !== mostRecent.id));

    try {
      await store.deleteLog(mostRecent.id);
    } catch {
      setLogs((prev) => [...prev, mostRecent]);
    }
    setPendingId(null);
  }

  async function handleCreateItem(input: ItemInput) {
    const item = await store.createItem(input);
    setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    setQuery("");
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
          <WeekProgressBar fraction={progress} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MacroStat label="Protein" value={totals.protein} avg={avg.protein} unit="g" />
          <MacroStat label="Carbs" value={totals.carbs} avg={avg.carbs} unit="g" />
          <MacroStat label="Fat" value={totals.fat} avg={avg.fat} unit="g" />
          <MacroStat label="Calories" value={totals.calories} avg={avg.calories} unit=" kcal" />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search your items…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NewItemDialog onCreate={handleCreateItem} />
      </div>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Results</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {searchResults.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                count={counts.get(item.id) ?? 0}
                pending={pendingId === item.id}
                onAdd={() => logItem(item.id)}
                onSubtract={() => unlogItem(item.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Logged this week</h2>
        {loggedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing logged yet — search above to add your first item.
          </p>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-1">
              {loggedItems.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <Separator className="my-1" />}
                  <ItemRow
                    item={item}
                    count={counts.get(item.id) ?? 0}
                    pending={pendingId === item.id}
                    onAdd={() => logItem(item.id)}
                    onSubtract={() => unlogItem(item.id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
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

function ItemRow({
  item,
  count,
  pending,
  onAdd,
  onSubtract,
}: {
  item: Item;
  count: number;
  pending: boolean;
  onAdd: () => void;
  onSubtract: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-accent">
      <button
        type="button"
        onClick={onAdd}
        disabled={pending}
        className="flex flex-1 flex-col items-start text-left disabled:opacity-60"
      >
        <span className="font-medium">{item.name}</span>
        <span className="text-xs text-muted-foreground">
          P{item.protein} · C{item.carbs} · F{item.fat} · {item.calories} kcal
        </span>
      </button>
      {count > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSubtract}
            disabled={pending}
            aria-label={`Remove one ${item.name}`}
            className="flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-60"
          >
            <Minus className="size-3" />
          </button>
          <Badge variant="secondary">×{count}</Badge>
        </div>
      )}
    </div>
  );
}
