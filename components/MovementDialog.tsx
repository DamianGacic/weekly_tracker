"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import type { Movement, MovementInput, MovementKind } from "@/lib/store/types";
import { GOAL_UNITS, KIND_LABELS, formatMovementAmount, parseDuration } from "@/lib/movement";
import { formatAmount, parseDecimal } from "@/lib/number";
import { getWeekStart } from "@/lib/week";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { GoalFields, Segmented, draftFor, goalFromDraft, sameDraft } from "@/components/GoalFields";

/** What one tap logs when the field is left blank: 10 reps, or 60 seconds. */
const DEFAULT_PER_TAP: Record<MovementKind, number> = { reps: 10, time: 60 };

type MovementDialogProps =
  | { mode: "create"; movement?: undefined; onSave: (input: MovementInput) => Promise<Movement> }
  | { mode: "edit"; movement: Movement; onSave: (input: MovementInput) => Promise<Movement> };

export function MovementDialog({ mode, movement, onSave }: MovementDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <DialogTrigger render={<Button variant="outline" />}>New move</DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${movement.name}`}
            />
          }
        >
          <Pencil className="size-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        {/* Mounted fresh on every open, so the form always starts from the saved move. */}
        <MovementForm
          movement={movement}
          onSave={async (input) => {
            await onSave(input);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function MovementForm({
  movement,
  onSave,
}: {
  movement?: Movement;
  onSave: (input: MovementInput) => Promise<void>;
}) {
  const [weekStart] = useState(() => getWeekStart(new Date()));
  const [name, setName] = useState(movement?.name ?? "");
  const [kind, setKind] = useState<MovementKind>(movement?.kind ?? "reps");
  const [perTap, setPerTap] = useState(movement ? formatAmount(movement.default_amount) : "");
  const [initialGoal] = useState(() =>
    draftFor(movement?.goal ?? null, weekStart, GOAL_UNITS[movement?.kind ?? "reps"].scale)
  );
  const [goal, setGoal] = useState(initialGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { unit, scale } = GOAL_UNITS[kind];
  const perTapAmount =
    perTap.trim() === ""
      ? DEFAULT_PER_TAP[kind]
      : kind === "time"
        ? parseDuration(perTap)
        : parseDecimal(perTap);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (!(perTapAmount > 0)) {
        throw new Error(
          kind === "time"
            ? "Enter how long one tap logs, e.g. 45 or 1:30."
            : "Enter how many reps one tap logs."
        );
      }
      // An untouched goal is kept exactly as stored, so saving never
      // re-anchors it on a rounded copy of its current value.
      const resolvedGoal =
        movement && sameDraft(goal, initialGoal)
          ? movement.goal
          : goalFromDraft(goal, "Weekly goal", weekStart, scale);
      setSaving(true);
      await onSave({ name: name.trim(), kind, default_amount: perTapAmount, goal: resolvedGoal });
    } catch (err) {
      const duplicate = (err as { code?: string } | null)?.code === "23505";
      setError(
        duplicate
          ? `You already have a move called “${name.trim()}”.`
          : err instanceof Error
            ? err.message
            : "Could not save move."
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{movement ? "Edit move" : "New move"}</DialogTitle>
        <DialogDescription>
          Moves are counted in reps, positions are held for a time. Tapping one logs its amount per
          tap.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="movement-name">Name</Label>
          <Input
            id="movement-name"
            value={name}
            placeholder={kind === "time" ? "e.g. Plank" : "e.g. Push-ups"}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm leading-none font-medium">Type</span>
          {movement ? (
            // Changing the type would reinterpret every logged rep as seconds, or the other way round.
            <p className="text-sm text-muted-foreground">
              {KIND_LABELS[kind].one} · {kind === "reps" ? "counted in reps" : "held for a time"}
            </p>
          ) : (
            <div>
              <Segmented
                label="Type"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "reps", label: "Move · reps" },
                  { value: "time", label: "Position · time" },
                ]}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="movement-per-tap">
            {kind === "reps" ? "Reps per tap" : "Time per tap (seconds, or m:ss)"}
          </Label>
          <Input
            id="movement-per-tap"
            type="text"
            inputMode={kind === "reps" ? "decimal" : "text"}
            placeholder={String(DEFAULT_PER_TAP[kind])}
            value={perTap}
            onChange={(e) => setPerTap(e.target.value)}
          />
          {perTapAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              Each tap logs {formatMovementAmount(kind, perTapAmount)}.
            </p>
          )}
        </div>
        <GoalFields
          id="movement-goal"
          label="Weekly goal"
          unit={unit}
          inputLabel={
            kind === "reps" ? "Weekly goal (reps, optional)" : "Weekly goal (minutes, optional)"
          }
          scale={scale}
          draft={goal}
          weekStart={weekStart}
          onChange={(patch) => setGoal((prev) => ({ ...prev, ...patch }))}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : movement ? "Save changes" : "Add move"}
        </Button>
      </DialogFooter>
    </form>
  );
}
