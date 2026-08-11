"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, LogEntry } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { getWeekStart, avgDaily, formatWeekRange } from "@/lib/week";
import { round1 } from "@/lib/macros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WeekTotals = { weekStart: Date; protein: number; carbs: number; fat: number; calories: number };

export function HistoryClient() {
  const { status } = useAuth();
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
  }, [store, status]);

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const orderedWeeks = useMemo(() => {
    const weeks = new Map<number, WeekTotals>();
    for (const log of logs) {
      const logDate = new Date(log.consumed_at);
      if (logDate >= weekStart) continue;
      const item = itemsById.get(log.item_id);
      if (!item) continue;
      const ws = getWeekStart(logDate);
      const key = ws.getTime();
      const existing = weeks.get(key) ?? { weekStart: ws, protein: 0, carbs: 0, fat: 0, calories: 0 };
      existing.protein += item.protein;
      existing.carbs += item.carbs;
      existing.fat += item.fat;
      existing.calories += item.calories;
      weeks.set(key, existing);
    }
    return Array.from(weeks.values()).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [logs, itemsById, weekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Past weeks</h1>
      {orderedWeeks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed weeks yet.</p>
      ) : (
        orderedWeeks.map((week) => {
          const now = new Date();
          return (
            <Card key={week.weekStart.getTime()}>
              <CardHeader>
                <CardTitle className="text-base">{formatWeekRange(week.weekStart)}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <WeekStat label="Protein" total={week.protein} weekStart={week.weekStart} now={now} unit="g" />
                <WeekStat label="Carbs" total={week.carbs} weekStart={week.weekStart} now={now} unit="g" />
                <WeekStat label="Fat" total={week.fat} weekStart={week.weekStart} now={now} unit="g" />
                <WeekStat label="Calories" total={week.calories} weekStart={week.weekStart} now={now} unit=" kcal" />
              </CardContent>
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
