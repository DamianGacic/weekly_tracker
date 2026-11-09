"use client";

import { Fragment, useMemo, useState } from "react";
import type { Lift, LiftSet } from "@/lib/store/types";
import { useLiftData } from "@/lib/store/useLiftData";
import { formatWeekLabel, formatWeekRange, getWeekStart, weeksBetween } from "@/lib/week";
import { formatSets, groupSets, setsByLift } from "@/lib/lifts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrackingGap } from "@/components/TrackingGap";
import { MovementStat } from "@/components/MovementDashboardClient";
import { LiftWeekEditor } from "@/components/LiftWeekEditor";

type WeekGroup = { weekStart: Date; weekSets: LiftSet[] };

export function LiftHistoryClient() {
  const { store, lifts, sets, setSets, loading, error } = useLiftData();
  const [expandedKey, setExpandedKey] = useState<number | null>(null);

  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);

  const weekGroups = useMemo(() => {
    const groups = new Map<number, LiftSet[]>();
    for (const set of sets) {
      const loggedAt = new Date(set.logged_at);
      if (loggedAt >= currentWeekStart) continue;
      const key = getWeekStart(loggedAt).getTime();
      const group = groups.get(key) ?? [];
      group.push(set);
      groups.set(key, group);
    }
    return Array.from(groups.entries())
      .map(([key, weekSets]): WeekGroup => ({ weekStart: new Date(key), weekSets }))
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [sets, currentWeekStart]);

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
        weekGroups.map(({ weekStart: ws, weekSets }, i) => {
          const key = ws.getTime();
          // Untracked weeks between this one and the next newer week shown (or this week).
          const gapWeeks = weeksBetween(ws, i === 0 ? currentWeekStart : weekGroups[i - 1].weekStart);
          const expanded = expandedKey === key;
          const byLift = setsByLift(weekSets);
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
                <CardContent className="grid grid-cols-2 gap-4">
                  <MovementStat
                    label="Sets"
                    value={String(weekSets.length)}
                    avg={`across ${byLift.size} ${byLift.size === 1 ? "lift" : "lifts"}`}
                  />
                </CardContent>
                <CardContent>
                  {expanded ? (
                    <LiftWeekEditor
                      lifts={lifts}
                      allSets={sets}
                      weekSets={weekSets}
                      weekStart={ws}
                      isCurrentWeek={false}
                      showGoals={false}
                      store={store}
                      onSetsChange={setSets}
                      emptyLabel="Nothing logged that week."
                    />
                  ) : (
                    <WeekLifts lifts={lifts} byLift={byLift} />
                  )}
                </CardContent>
              </Card>
            </Fragment>
          );
        })
      )}
    </div>
  );
}

/** What was lifted that week: per lift, its sets hardest first. */
function WeekLifts({ lifts, byLift }: { lifts: Lift[]; byLift: Map<string, LiftSet[]> }) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {lifts
        .filter((lift) => byLift.has(lift.id))
        .map((lift) => (
          <li key={lift.id} className="flex flex-col">
            <span>{lift.name}</span>
            <span className="text-xs text-muted-foreground">
              {groupSets(byLift.get(lift.id)!)
                .map((group) => formatSets(group.count, group))
                .join(" · ")}
            </span>
          </li>
        ))}
    </ul>
  );
}
