"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { Item, LogEntry, RawMacroEntry, WeekNotes } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import {
  getWeekStart,
  avgDaily,
  formatWeekRange,
  formatWeekLabel,
  localDateKey,
  weeksBetween,
} from "@/lib/week";
import { addMacros, portionsByItem, sumMacros, round1 } from "@/lib/macros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrackingGap } from "@/components/TrackingGap";
import { WeekLogEditor } from "@/components/WeekLogEditor";
import { MacroSplitSummary } from "@/components/MacroSplit";
import { WeekNote, WeekNoteView, withWeekNote } from "@/components/WeekNote";
import { LoadWarning } from "@/components/LoadWarning";

type WeekGroup = { weekStart: Date; weekLogs: LogEntry[]; weekRawMacros: RawMacroEntry[] };

export function HistoryClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawMacros, setRawMacros] = useState<RawMacroEntry[]>([]);
  const [notes, setNotes] = useState<WeekNotes>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Optional parts that failed to load, named above the weeks (see DashboardClient).
  const [missing, setMissing] = useState<string[]>([]);
  const [expandedKey, setExpandedKey] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    const failed: string[] = [];
    // Notes and raw macros are optional, so failing to load them shouldn't
    // take History down; the page says what's missing instead.
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
      optional(store.listWeekNotes(), "week notes", {} as WeekNotes),
      optional(store.listRawMacros(), "additional raw macros", [] as RawMacroEntry[]),
    ])
      .then(([loadedItems, loadedLogs, loadedNotes, loadedRawMacros]) => {
        if (!active) return;
        setItems(loadedItems);
        setLogs(loadedLogs);
        setRawMacros(loadedRawMacros);
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

  const weekGroups = useMemo(() => {
    const groups = new Map<number, WeekGroup>();
    // The group of the past week `consumedAt` falls in, or null if it's in this week.
    function groupFor(consumedAt: string): WeekGroup | null {
      const date = new Date(consumedAt);
      if (date >= weekStart) return null;
      const start = getWeekStart(date);
      const group = groups.get(start.getTime()) ?? {
        weekStart: start,
        weekLogs: [],
        weekRawMacros: [],
      };
      groups.set(start.getTime(), group);
      return group;
    }
    for (const log of logs) groupFor(log.consumed_at)?.weekLogs.push(log);
    for (const entry of rawMacros) groupFor(entry.consumed_at)?.weekRawMacros.push(entry);
    return Array.from(groups.values()).sort(
      (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
    );
  }, [logs, rawMacros, weekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Past weeks</h1>
      <LoadWarning missing={missing} />
      {weekGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed weeks yet.</p>
      ) : (
        weekGroups.map(({ weekStart: ws, weekLogs, weekRawMacros }, i) => {
          const key = ws.getTime();
          // Untracked weeks between this one and the next newer week shown (or this week).
          const gapWeeks = weeksBetween(ws, i === 0 ? weekStart : weekGroups[i - 1].weekStart);
          const expanded = expandedKey === key;
          const portions = portionsByItem(weekLogs);
          const totals = addMacros(sumMacros(items, portions), weekRawMacros);
          const weekKey = localDateKey(ws);
          const note = notes[weekKey] ?? "";
          const now = new Date();
          return (
            <Fragment key={key}>
              {gapWeeks > 0 && <TrackingGap after={ws} weeks={gapWeeks} />}
              <Card>
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
                <CardContent>
                  <MacroSplitSummary macros={totals} />
                </CardContent>
                {!expanded && note.trim() !== "" && (
                  <CardContent>
                    <WeekNoteView note={note} />
                  </CardContent>
                )}
                {expanded && (
                  <CardContent className="flex flex-col gap-4">
                    <WeekNote
                      weekKey={weekKey}
                      note={note}
                      store={store}
                      onSaved={(key, saved) => setNotes((prev) => withWeekNote(prev, key, saved))}
                    />
                    <WeekLogEditor
                      items={items}
                      weekLogs={weekLogs}
                      weekRawMacros={weekRawMacros}
                      weekStart={ws}
                      isCurrentWeek={false}
                      store={store}
                      onLogsChange={setLogs}
                      onRawMacrosChange={setRawMacros}
                      onItemsChange={setItems}
                      emptyLabel="Nothing logged that week."
                    />
                  </CardContent>
                )}
              </Card>
            </Fragment>
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
