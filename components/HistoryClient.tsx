"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, LogEntry } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { getWeekStart, avgDaily, formatWeekRange, formatWeekLabel } from "@/lib/week";
import { countLogsByItem, sumMacros, round1 } from "@/lib/macros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeekLogEditor } from "@/components/WeekLogEditor";

type WeekGroup = { weekStart: Date; weekLogs: LogEntry[] };

export function HistoryClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<number | null>(null);

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

  const weekGroups = useMemo(() => {
    const groups = new Map<number, LogEntry[]>();
    for (const log of logs) {
      const logDate = new Date(log.consumed_at);
      if (logDate >= weekStart) continue;
      const key = getWeekStart(logDate).getTime();
      const group = groups.get(key) ?? [];
      group.push(log);
      groups.set(key, group);
    }
    return Array.from(groups.entries())
      .map(([key, weekLogs]): WeekGroup => ({ weekStart: new Date(key), weekLogs }))
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [logs, weekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Past weeks</h1>
      {weekGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed weeks yet.</p>
      ) : (
        weekGroups.map(({ weekStart: ws, weekLogs }) => {
          const key = ws.getTime();
          const expanded = expandedKey === key;
          const counts = countLogsByItem(weekLogs);
          const totals = sumMacros(items, counts);
          const now = new Date();
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{formatWeekRange(ws)}</CardTitle>
                    <p className="text-xs text-muted-foreground">{formatWeekLabel(ws)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedKey(expanded ? null : key)}
                  >
                    {expanded ? "Done" : "Edit"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <WeekStat label="Protein" total={totals.protein} weekStart={ws} now={now} unit="g" />
                <WeekStat label="Carbs" total={totals.carbs} weekStart={ws} now={now} unit="g" />
                <WeekStat label="Fat" total={totals.fat} weekStart={ws} now={now} unit="g" />
                <WeekStat
                  label="Calories"
                  total={totals.calories}
                  weekStart={ws}
                  now={now}
                  unit=" kcal"
                />
              </CardContent>
              {expanded && (
                <CardContent>
                  <WeekLogEditor
                    items={items}
                    weekLogs={weekLogs}
                    weekStart={ws}
                    isCurrentWeek={false}
                    store={store}
                    onLogsChange={setLogs}
                    emptyLabel="Nothing logged that week."
                  />
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function WeekStat({
  label,
  total,
  weekStart,
  now,
  unit,
}: {
  label: string;
  total: number;
  weekStart: Date;
  now: Date;
  unit: string;
}) {
  const avg = avgDaily(total, { weekStart, now, isCurrentWeek: false });
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">
        {round1(total)}
        {unit}
      </span>
      <span className="text-xs text-muted-foreground">
        {round1(avg)}
        {unit}/day avg
      </span>
    </div>
  );
}
