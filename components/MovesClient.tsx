"use client";

import { useState } from "react";
import type { Movement } from "@/lib/store/types";
import { useMovementData } from "@/lib/store/useMovementData";
import { goalForWeek } from "@/lib/goals";
import { KINDS, GOAL_UNITS, KIND_LABELS, formatMovementAmount } from "@/lib/movement";
import { round1 } from "@/lib/macros";
import { getWeekStart } from "@/lib/week";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MovementDialog } from "@/components/MovementDialog";
import { formatStep } from "@/components/GoalFields";

export function MovesClient() {
  const { movements, loading, error, createMovement, updateMovement } = useMovementData();
  const [weekStart] = useState(() => getWeekStart(new Date()));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your moves</h1>
        <MovementDialog mode="create" onSave={createMovement} />
      </div>
      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No moves yet — add your first one above. Moves are counted in reps (push-ups, squats),
          positions are held for a time (plank, dead hang).
        </p>
      ) : (
        KINDS.map((kind) => {
          const ofKind = movements.filter((movement) => movement.kind === kind);
          if (ofKind.length === 0) return null;
          return (
            <Card key={kind}>
              <CardHeader>
                <CardTitle className="text-base">{KIND_LABELS[kind].many}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {ofKind.map((movement, i) => (
                  <div key={movement.id}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="flex items-center justify-between gap-2 px-2 py-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium">{movement.name}</span>
                        <span className="text-xs text-muted-foreground">
                          +{formatMovementAmount(movement.kind, movement.default_amount)} per tap
                          {" · "}
                          {goalSummary(movement, weekStart)}
                        </span>
                      </div>
                      <MovementDialog
                        mode="edit"
                        movement={movement}
                        onSave={(input) => updateMovement(movement.id, input)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function goalSummary(movement: Movement, weekStart: Date): string {
  if (!movement.goal) return "no weekly goal";
  const { unit, scale } = GOAL_UNITS[movement.kind];
  const target = `goal ${round1(goalForWeek(movement.goal, weekStart) / scale)}${unit} this week`;
  return movement.goal.step === 0 ? target : `${target}, ${formatStep(movement.goal, unit, scale)}`;
}
