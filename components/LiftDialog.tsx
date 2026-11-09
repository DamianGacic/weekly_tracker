"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { Lift, LiftGoalLine, LiftInput } from "@/lib/store/types";
import { normalizeGoal, parseCount, parseWeight } from "@/lib/lifts";
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
  DialogTrigger,
} from "@/components/ui/dialog";

type LiftDialogProps =
  | { mode: "create"; lift?: undefined; onSave: (input: LiftInput) => Promise<Lift> }
  | { mode: "edit"; lift: Lift; onSave: (input: LiftInput) => Promise<Lift> };

export function LiftDialog({ mode, lift, onSave }: LiftDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <DialogTrigger render={<Button variant="outline" />}>New lift</DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${lift.name}`} />
          }
        >
          <Pencil className="size-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        {/* Mounted fresh on every open, so the form always starts from the saved lift. */}
        <LiftForm
          lift={lift}
          onSave={async (input) => {
            await onSave(input);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

type LineDraft = { key: number; sets: string; weight: string; reps: string };

let nextLineKey = 0;

function draftLine(line?: LiftGoalLine): LineDraft {
  nextLineKey += 1;
  return {
    key: nextLineKey,
    sets: line ? String(line.sets) : "",
    weight: line ? formatAmount(line.weight) : "",
    reps: line ? String(line.reps) : "",
  };
}

/** The goal from the lines typed in; fully blank lines are skipped. Throws a user-facing message. */
function goalFromDrafts(drafts: LineDraft[]): LiftGoalLine[] {
  const lines: LiftGoalLine[] = [];
  for (const draft of drafts) {
    if ([draft.sets, draft.weight, draft.reps].every((value) => value.trim() === "")) continue;
    const sets = parseCount(draft.sets);
    const weight = parseWeight(draft.weight);
    const reps = parseCount(draft.reps);
    if (Number.isNaN(sets)) throw new Error("Each goal line needs a whole number of sets, 1 or more.");
    if (Number.isNaN(weight)) throw new Error("Each goal line needs a weight in kg (0 for bodyweight).");
    if (Number.isNaN(reps)) throw new Error("Each goal line needs a whole number of reps, 1 or more.");
    lines.push({ sets, weight, reps });
  }
  return normalizeGoal(lines);
}

function LiftForm({ lift, onSave }: { lift?: Lift; onSave: (input: LiftInput) => Promise<void> }) {
  const [name, setName] = useState(lift?.name ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() => (lift?.goal ?? []).map(draftLine));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchLine(key: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  /** A new line starts as a copy of the one above, since goal lines often share a weight or reps. */
  function addLine() {
    setLines((prev) => {
      const above = prev[prev.length - 1];
      return [...prev, above ? { ...above, key: draftLine().key } : draftLine()];
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const goal = goalFromDrafts(lines);
      setSaving(true);
      await onSave({ name: name.trim(), goal });
    } catch (err) {
      const duplicate = (err as { code?: string } | null)?.code === "23505";
      setError(
        duplicate
          ? `You already have a lift called “${name.trim()}”.`
          : err instanceof Error
            ? err.message
            : "Could not save lift."
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{lift ? "Edit lift" : "New lift"}</DialogTitle>
        <DialogDescription>
          Lifts are logged in sets, each with its own weight and reps.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="lift-name">Name</Label>
          <Input
            id="lift-name"
            value={name}
            placeholder="e.g. Bench press"
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm leading-none font-medium">Weekly goal (optional)</span>
          <p className="text-xs text-muted-foreground">
            A set counts toward a line when it has at least that weight and at least that many
            reps: 105 kg × 5 and 107.5 kg × 4 both count as 105 kg × 4. Each set counts once,
            and harder lines are filled first.
          </p>
          {lines.map((line, i) => (
            <div key={line.key} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
              <Input
                type="text"
                inputMode="numeric"
                aria-label={`Goal line ${i + 1}: sets`}
                placeholder="3"
                className="w-11 text-center"
                value={line.sets}
                onChange={(e) => patchLine(line.key, { sets: e.target.value })}
              />
              <span className="text-muted-foreground">sets of</span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`Goal line ${i + 1}: weight in kg`}
                placeholder="80"
                className="w-16 text-center"
                value={line.weight}
                onChange={(e) => patchLine(line.key, { weight: e.target.value })}
              />
              <span className="text-muted-foreground">kg for</span>
              <Input
                type="text"
                inputMode="numeric"
                aria-label={`Goal line ${i + 1}: reps`}
                placeholder="5"
                className="w-11 text-center"
                value={line.reps}
                onChange={(e) => patchLine(line.key, { reps: e.target.value })}
              />
              <span className="text-muted-foreground">reps</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove goal line ${i + 1}`}
                onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
              >
                <X />
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus />
              {lines.length === 0 ? "Add a goal" : "Add goal line"}
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : lift ? "Save changes" : "Add lift"}
        </Button>
      </DialogFooter>
    </form>
  );
}
