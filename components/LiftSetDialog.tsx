"use client";

import { useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import type { Lift } from "@/lib/store/types";
import {
  MAX_SETS_AT_ONCE,
  WEIGHT_STEP,
  formatSet,
  formatSets,
  parseCount,
  parseWeight,
  type SetSpec,
} from "@/lib/lifts";
import { formatAmount } from "@/lib/number";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Logs sets with exactly the weight and reps they had: starts from `initial`
 * (usually the lift's last set), so a set that differs only a little is a
 * tap or two on the − / + buttons away. Several identical sets can be
 * logged at once.
 */
export function LiftSetDialog({
  lift,
  initial,
  last,
  open,
  onOpenChange,
  onLog,
}: {
  /** Kept set while closing, so the content doesn't vanish mid-animation. */
  lift: Lift | null;
  /** What the fields start at; blank when null. */
  initial: SetSpec | null;
  /** The lift's last set, shown for reference. */
  last: SetSpec | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLog: (spec: SetSpec, count: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed so the fields start over from `initial` every time it opens. */}
        {lift && open && (
          <SetForm
            key={`${lift.id}|${initial?.weight}|${initial?.reps}`}
            lift={lift}
            initial={initial}
            last={last}
            onLog={(spec, count) => {
              onLog(spec, count);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SetForm({
  lift,
  initial,
  last,
  onLog,
}: {
  lift: Lift;
  initial: SetSpec | null;
  last: SetSpec | null;
  onLog: (spec: SetSpec, count: number) => void;
}) {
  const [weight, setWeight] = useState(initial ? formatAmount(initial.weight) : "");
  const [reps, setReps] = useState(initial ? String(initial.reps) : "");
  const [count, setCount] = useState("1");

  const parsedWeight = parseWeight(weight);
  const parsedReps = parseCount(reps);
  const parsedCount = parseCount(count);
  const valid =
    !Number.isNaN(parsedWeight) &&
    !Number.isNaN(parsedReps) &&
    !Number.isNaN(parsedCount) &&
    parsedCount <= MAX_SETS_AT_ONCE;
  const spec = { weight: parsedWeight, reps: parsedReps };

  const problem =
    weight.trim() !== "" && Number.isNaN(parsedWeight)
      ? "Weight must be a number of kg, 0 or more."
      : reps.trim() !== "" && Number.isNaN(parsedReps)
        ? "Reps must be a whole number, 1 or more."
        : count.trim() !== "" && (Number.isNaN(parsedCount) || parsedCount > MAX_SETS_AT_ONCE)
          ? `Sets must be a whole number from 1 to ${MAX_SETS_AT_ONCE}.`
          : null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) onLog(spec, parsedCount);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Log sets of {lift.name}</DialogTitle>
        <DialogDescription>
          {last ? `Your last set was ${formatSet(last)}.` : "No sets of this lift yet."} Use 0 kg
          for bodyweight.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3 py-4">
        <Stepper
          id="lift-weight"
          label="Weight (kg)"
          value={weight}
          onChange={setWeight}
          inputMode="decimal"
          placeholder="e.g. 60"
          step={(direction) => {
            const current = Number.isNaN(parsedWeight) ? 0 : parsedWeight;
            setWeight(formatAmount(Math.max(0, current + direction * WEIGHT_STEP)));
          }}
          stepLabel={`${formatAmount(WEIGHT_STEP)} kg`}
          autoFocus={!initial}
        />
        <Stepper
          id="lift-reps"
          label="Reps"
          value={reps}
          onChange={setReps}
          inputMode="numeric"
          placeholder="e.g. 8"
          step={(direction) => {
            const current = Number.isNaN(parsedReps) ? 0 : parsedReps;
            setReps(String(Math.max(1, current + direction)));
          }}
          stepLabel="1 rep"
        />
        <Stepper
          id="lift-sets"
          label="Sets"
          value={count}
          onChange={setCount}
          inputMode="numeric"
          placeholder="1"
          step={(direction) => {
            const current = Number.isNaN(parsedCount) ? 0 : parsedCount;
            setCount(String(Math.min(MAX_SETS_AT_ONCE, Math.max(1, current + direction))));
          }}
          stepLabel="1 set"
        />
        {problem && <p className="text-sm text-destructive">{problem}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!valid}>
          {valid ? `Log ${formatSets(parsedCount, spec)}` : "Log"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Stepper({
  id,
  label,
  value,
  onChange,
  inputMode,
  placeholder,
  step,
  stepLabel,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode: "decimal" | "numeric";
  placeholder: string;
  /** Called with -1 or +1. */
  step: (direction: -1 | 1) => void;
  /** What one step is, for screen readers: "2.5 kg". */
  stepLabel: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${label}: ${stepLabel} less`}
          onClick={() => step(-1)}
        >
          <Minus />
        </Button>
        <Input
          id={id}
          type="text"
          inputMode={inputMode}
          placeholder={placeholder}
          className="w-20 text-center"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          autoFocus={autoFocus}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${label}: ${stepLabel} more`}
          onClick={() => step(1)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
