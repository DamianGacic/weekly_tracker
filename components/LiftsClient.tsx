"use client";

import { useLiftData } from "@/lib/store/useLiftData";
import { formatSet, formatSets, goalSetCount, lastSetOf } from "@/lib/lifts";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LiftDialog } from "@/components/LiftDialog";

export function LiftsClient() {
  const { lifts, sets, loading, error, createLift, updateLift } = useLiftData();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your lifts</h1>
        <LiftDialog mode="create" onSave={createLift} />
      </div>
      {lifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No lifts yet — add your first one above. Each set of a lift is logged with its weight and
          reps, and a lift can have a weekly goal like 3 sets of 105 kg for 4 reps.
        </p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-1">
            {lifts.map((lift, i) => {
              const last = lastSetOf(sets, lift.id, now);
              return (
                <div key={lift.id}>
                  {i > 0 && <Separator className="my-1" />}
                  <div className="flex items-start justify-between gap-2 px-2 py-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium">{lift.name}</span>
                      {lift.goal.length === 0 ? (
                        <span className="text-xs text-muted-foreground">no weekly goal</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Goal, {goalSetCount(lift.goal)} sets a week:{" "}
                          {lift.goal.map((line) => formatSets(line.sets, line)).join(" · ")}
                        </span>
                      )}
                      {last && (
                        <span className="text-xs text-muted-foreground">
                          Last set: {formatSet(last)}
                        </span>
                      )}
                    </div>
                    <LiftDialog
                      mode="edit"
                      lift={lift}
                      onSave={(input) => updateLift(lift.id, input)}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
