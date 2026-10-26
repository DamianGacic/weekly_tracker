"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import type { Goal, GoalStepMode, Goals } from "@/lib/store/types";
import { goalForWeek } from "@/lib/goals";
import { round1 } from "@/lib/macros";
import { parseDecimal } from "@/lib/number";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function formatStep(goal: Goal, unit: string): string {
  const sign = goal.step > 0 ? "+" : "−";
  const amount = round1(Math.abs(goal.step));
  return `${sign}${amount}${goal.stepMode === "percent" ? "%" : unit}/week`;
}

type Direction = "same" | "increase" | "decrease";

type GoalDraft = { value: string; direction: Direction; amount: string; mode: GoalStepMode };

function draftFor(goal: Goal | null, weekStart: Date): GoalDraft {
  if (!goal) return { value: "", direction: "same", amount: "", mode: "flat" };
  return {
    value: String(round1(goalForWeek(goal, weekStart))),
    direction: goal.step > 0 ? "increase" : goal.step < 0 ? "decrease" : "same",
    amount: goal.step === 0 ? "" : String(Math.abs(goal.step)),
    mode: goal.stepMode,
  };
}

function sameDraft(a: GoalDraft, b: GoalDraft): boolean {
  return (
    a.value.trim() === b.value.trim() &&
    a.direction === b.direction &&
    a.amount.trim() === b.amount.trim() &&
    a.mode === b.mode
  );
}

/**
 * Turns a draft back into a goal anchored at `weekStart` — this week's value
 * becomes the new base that later weekly changes build on. Throws a
 * user-facing message for invalid input.
 */
function goalFromDraft(draft: GoalDraft, label: string, weekStart: Date): Goal | null {
  if (draft.value.trim() === "") return null;
  const value = parseDecimal(draft.value);
  if (value < 0) throw new Error(`${label} can't be negative.`);

  let step = 0;
  if (draft.direction !== "same") {
    const amount = parseDecimal(draft.amount);
    if (amount <= 0) throw new Error(`Enter how much ${label.toLowerCase()} should change each week.`);
    if (draft.mode === "percent" && draft.direction === "decrease" && amount >= 100) {
      throw new Error(`A weekly ${label.toLowerCase()} decrease must be under 100%.`);
    }
    step = draft.direction === "increase" ? amount : -amount;
  }

  return { value, anchorWeek: weekStart.toISOString(), step, stepMode: draft.mode };
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
            goalKey={key}
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

function GoalFields({
  goalKey,
  draft,
  weekStart,
  onChange,
}: {
  goalKey: GoalKey;
  draft: GoalDraft;
  weekStart: Date;
  onChange: (patch: Partial<GoalDraft>) => void;
}) {
  const { label, unit, inputLabel } = GOAL_FIELDS[goalKey];
  const inputId = `goal-${goalKey}`;

  let preview: Goal | null = null;
  try {
    preview = goalFromDraft(draft, label, weekStart);
  } catch {
    // Incomplete input — just skip the preview until it's valid.
  }
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{inputLabel}</Label>
      <Input
        id={inputId}
        type="text"
        inputMode="decimal"
        placeholder="Not set"
        value={draft.value}
        onChange={(e) => onChange({ value: e.target.value })}
      />
      {preview && (
        <p className="text-xs text-muted-foreground">
          ≈ {round1(preview.value / 7)}
          {unit}/day
          {preview.step !== 0 && (
            <>
              {" "}
              · next week {round1(goalForWeek(preview, nextWeek))}
              {unit}
            </>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Every week:</span>
        <Segmented
          label={`${label} weekly change`}
          value={draft.direction}
          onChange={(direction) => onChange({ direction })}
          options={[
            { value: "same", label: "Keep" },
            { value: "increase", label: "Increase" },
            { value: "decrease", label: "Decrease" },
          ]}
        />
      </div>
      {draft.direction !== "same" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">by</span>
          <Input
            type="text"
            inputMode="decimal"
            aria-label={`${label} weekly change amount`}
            className="w-20"
            value={draft.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
          />
          <Segmented
            label={`${label} weekly change unit`}
            value={draft.mode}
            onChange={(mode) => onChange({ mode })}
            options={[
              { value: "flat", label: unit.trim() },
              { value: "percent", label: "%" },
            ]}
          />
          {draft.mode === "percent" && (
            <span className="text-xs text-muted-foreground">of the previous week</span>
          )}
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            option.value === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
