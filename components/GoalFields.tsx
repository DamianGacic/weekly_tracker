"use client";

import type { Goal, GoalStepMode } from "@/lib/store/types";
import { goalForWeek } from "@/lib/goals";
import { round1 } from "@/lib/macros";
import { formatAmount, parseDecimal } from "@/lib/number";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Shared by the macro goals and the movement goals: a weekly value plus an
// optional change applied once per week. `scale` converts the unit shown here
// into the unit the goal is stored in (e.g. 60 when a goal stored in seconds
// is entered in minutes); percentages are unaffected by it.

export function formatStep(goal: Goal, unit: string, scale = 1): string {
  const sign = goal.step > 0 ? "+" : "−";
  const percent = goal.stepMode === "percent";
  const amount = round1(Math.abs(goal.step) / (percent ? 1 : scale));
  return `${sign}${amount}${percent ? "%" : unit}/week`;
}

type Direction = "same" | "increase" | "decrease";

export type GoalDraft = { value: string; direction: Direction; amount: string; mode: GoalStepMode };

export function draftFor(goal: Goal | null, weekStart: Date, scale = 1): GoalDraft {
  if (!goal) return { value: "", direction: "same", amount: "", mode: "flat" };
  const stepScale = goal.stepMode === "percent" ? 1 : scale;
  return {
    value: String(round1(goalForWeek(goal, weekStart) / scale)),
    direction: goal.step > 0 ? "increase" : goal.step < 0 ? "decrease" : "same",
    amount: goal.step === 0 ? "" : formatAmount(Math.abs(goal.step) / stepScale),
    mode: goal.stepMode,
  };
}

export function sameDraft(a: GoalDraft, b: GoalDraft): boolean {
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
export function goalFromDraft(
  draft: GoalDraft,
  label: string,
  weekStart: Date,
  scale = 1
): Goal | null {
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
    const stored = draft.mode === "percent" ? amount : amount * scale;
    step = draft.direction === "increase" ? stored : -stored;
  }

  return { value: value * scale, anchorWeek: weekStart.toISOString(), step, stepMode: draft.mode };
}

export function GoalFields({
  id,
  label,
  unit,
  inputLabel,
  scale = 1,
  draft,
  weekStart,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  inputLabel: string;
  scale?: number;
  draft: GoalDraft;
  weekStart: Date;
  onChange: (patch: Partial<GoalDraft>) => void;
}) {
  let preview: Goal | null = null;
  try {
    preview = goalFromDraft(draft, label, weekStart, scale);
  } catch {
    // Incomplete input — just skip the preview until it's valid.
  }
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{inputLabel}</Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder="Not set"
        value={draft.value}
        onChange={(e) => onChange({ value: e.target.value })}
      />
      {preview && (
        <p className="text-xs text-muted-foreground">
          ≈ {round1(preview.value / 7 / scale)}
          {unit}/day
          {preview.step !== 0 && (
            <>
              {" "}
              · next week {round1(goalForWeek(preview, nextWeek) / scale)}
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

export function Segmented<T extends string>({
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
