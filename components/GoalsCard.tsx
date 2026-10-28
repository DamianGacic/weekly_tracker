"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import type { Goal, Goals } from "@/lib/store/types";
import { goalForWeek } from "@/lib/goals";
import { round1 } from "@/lib/macros";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GoalFields,
  draftFor,
  formatStep,
  goalFromDraft,
  sameDraft,
  type GoalDraft,
} from "@/components/GoalFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type GoalKey = keyof Goals;

const GOAL_FIELDS: Record<GoalKey, { label: string; hint: string; unit: string; inputLabel: string }> = {
  protein: { label: "Protein", hint: "at least", unit: "g", inputLabel: "Protein goal (g per week)" },
  calories: {
    label: "Calories",
    hint: "at most",
    unit: " kcal",
    inputLabel: "Calorie limit (kcal per week)",
  },
};

export function GoalsCard({
  goals,
  weekStart,
  onSave,
}: {
  goals: Goals;
  weekStart: Date;
  onSave: (goals: Goals) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton={false}
        render={
          <Card
            className="cursor-pointer transition-shadow outline-none hover:ring-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Goals</CardTitle>
            <Pencil className="size-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Per week · click to edit</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <GoalSummary goalKey="protein" goal={goals.protein} weekStart={weekStart} />
          <GoalSummary goalKey="calories" goal={goals.calories} weekStart={weekStart} />
        </CardContent>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* Mounted fresh on every open, so the form always starts from the current goals. */}
        <GoalsForm
          goals={goals}
          weekStart={weekStart}
          onSave={async (next) => {
            await onSave(next);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function GoalSummary({
  goalKey,
  goal,
  weekStart,
}: {
  goalKey: GoalKey;
  goal: Goal | null;
  weekStart: Date;
}) {
  const { label, hint, unit } = GOAL_FIELDS[goalKey];
  const target = goal ? goalForWeek(goal, weekStart) : null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">
        {label} · {hint}
      </span>
      {target === null ? (
        <span className="text-sm text-muted-foreground">Not set</span>
      ) : (
        <>
          <span className="text-xl font-semibold">
            {round1(target)}
            {unit}
          </span>
          <span className="text-xs text-muted-foreground">
            {round1(target / 7)}
            {unit}/day
            {goal && goal.step !== 0 && <> · {formatStep(goal, unit)}</>}
          </span>
        </>
      )}
    </div>
  );
}

function GoalsForm({
  goals,
  weekStart,
  onSave,
}: {
  goals: Goals;
  weekStart: Date;
  onSave: (goals: Goals) => Promise<void>;
}) {
  const [initial] = useState(() => ({
    protein: draftFor(goals.protein, weekStart),
    calories: draftFor(goals.calories, weekStart),
  }));
  const [drafts, setDrafts] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: GoalKey, patch: Partial<GoalDraft>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  // An untouched goal is kept exactly as stored, so opening and saving the
  // dialog never re-anchors it on a rounded copy of its current value.
  function resolve(key: GoalKey): Goal | null {
    if (sameDraft(drafts[key], initial[key])) return goals[key];
    return goalFromDraft(drafts[key], GOAL_FIELDS[key].label, weekStart);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave({ protein: resolve("protein"), calories: resolve("calories") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save goals.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Weekly goals</DialogTitle>
        <DialogDescription>
          Goals carry over to every new week until you change them. Leave a field blank to turn
          that goal off.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-6 py-4">
        {(Object.keys(GOAL_FIELDS) as GoalKey[]).map((key) => (
          <GoalFields
            key={key}
            id={`goal-${key}`}
            label={GOAL_FIELDS[key].label}
            unit={GOAL_FIELDS[key].unit}
            inputLabel={GOAL_FIELDS[key].inputLabel}
            draft={drafts[key]}
            weekStart={weekStart}
            onChange={(patch) => update(key, patch)}
          />
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save goals"}
        </Button>
      </DialogFooter>
    </form>
  );
}
