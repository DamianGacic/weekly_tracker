"use client";

import { useMemo, useState } from "react";
import type { Movement, MovementKind, MovementLog } from "@/lib/store/types";
import { useMovementData } from "@/lib/store/useMovementData";
import { avgDaily, formatWeekLabel, formatWeekRange, getWeekStart } from "@/lib/week";
import { KINDS, formatDuration, formatMovementAmount, totalsByMovement } from "@/lib/movement";
import { round1 } from "@/lib/macros";
import { formatAmount } from "@/lib/number";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MovementLogEditor } from "@/components/MovementLogEditor";
import { MovementStat } from "@/components/MovementDashboardClient";

type WeekGroup = { weekStart: Date; weekLogs: MovementLog[] };

export function MovementHistoryClient() {
  const { store, movements, logs, setLogs, loading, error } = useMovementData();
  const [expandedKey, setExpandedKey] = useState<number | null>(null);

  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);

  const weekGroups = useMemo(() => {
    const groups = new Map<number, MovementLog[]>();
    for (const log of logs) {
      const loggedAt = new Date(log.logged_at);
      if (loggedAt >= currentWeekStart) continue;
      const key = getWeekStart(loggedAt).getTime();
      const group = groups.get(key) ?? [];
      group.push(log);
      groups.set(key, group);
    }
    return Array.from(groups.entries())
      .map(([key, weekLogs]): WeekGroup => ({ weekStart: new Date(key), weekLogs }))
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [logs, currentWeekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
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
          const totals = totalsByMovement(weekLogs);
          const now = new Date();
          const totalFor = (kind: MovementKind) =>
            movements
              .filter((movement) => movement.kind === kind)
              .reduce((sum, movement) => sum + (totals.get(movement.id) ?? 0), 0);
          const reps = totalFor("reps");
          const seconds = totalFor("time");
          const avg = (total: number) => avgDaily(total, { weekStart: ws, now, isCurrentWeek: false });
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
              {expanded ? (
                <CardContent>
                  <MovementLogEditor
                    movements={movements}
                    weekLogs={weekLogs}
                    weekStart={ws}
                    isCurrentWeek={false}
                    store={store}
                    onLogsChange={setLogs}
                    emptyLabel="Nothing logged that week."
                  />
                </CardContent>
              ) : (
                <CardContent>
                  <WeekTotals movements={movements} totals={totals} />
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

/** What was done that week, per move and position, most first. */
function WeekTotals({ movements, totals }: { movements: Movement[]; totals: Map<string, number> }) {
  const rows = KINDS.flatMap((kind) =>
    movements
      .filter((movement) => movement.kind === kind && (totals.get(movement.id) ?? 0) > 0)
      .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0))
  );
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {rows.map((movement) => (
        <li key={movement.id} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate">{movement.name}</span>
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {formatMovementAmount(movement.kind, totals.get(movement.id) ?? 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}
