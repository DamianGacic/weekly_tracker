"use client";

import { useState, type FormEvent } from "react";
import { Check, Pencil } from "lucide-react";
import type { Habit, HabitInput } from "@/lib/store/types";
import { formatGoalDays, habitsIncluding, includedHabitIds } from "@/lib/habits";
import { cn } from "@/lib/utils";
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
import { Segmented } from "@/components/GoalFields";

const GOAL_OPTIONS = [
  { value: "none", label: "None" },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) })),
];

type HabitDialogProps = {
  /** Every habit, to choose the included ones from. */
  habits: Habit[];
  onSave: (input: HabitInput) => Promise<Habit>;
} & ({ mode: "create"; habit?: undefined } | { mode: "edit"; habit: Habit });

export function HabitDialog({ mode, habit, habits, onSave }: HabitDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <DialogTrigger render={<Button variant="outline" />}>New habit</DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${habit.name}`} />
          }
        >
          <Pencil className="size-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        {/* Mounted fresh on every open, so the form always starts from the saved habit. */}
        <HabitForm
          habit={habit}
          habits={habits}
          onSave={async (input) => {
            await onSave(input);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function HabitForm({
  habit,
  habits,
  onSave,
}: {
  habit?: Habit;
  habits: Habit[];
  onSave: (input: HabitInput) => Promise<void>;
}) {
  const [name, setName] = useState(habit?.name ?? "");
  const [goal, setGoal] = useState(habit?.goal_days ? String(habit.goal_days) : "none");
  const [includes, setIncludes] = useState<string[]>(habit?.includes ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selfId = habit?.id ?? "new";
  const others = habits.filter((h) => h.id !== selfId);
  // Habits that include this one can't be included by it: that would be a circle.
  const blocked = habit ? habitsIncluding(habits, habit.id) : new Set<string>();
  // Everything a check of this habit would also check, with the current choices.
  const draft: Habit = {
    id: selfId,
    name,
    goal_days: null,
    includes,
    created_at: "",
  };
  const alsoChecks = [...includedHabitIds([...others, draft], selfId)].flatMap(
    (id) => others.find((h) => h.id === id)?.name ?? []
  );

  function toggleInclude(id: string) {
    setIncludes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Enter a name.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: trimmed,
        goal_days: goal === "none" ? null : Number(goal),
        // Only habits that still exist and wouldn't make a circle.
        includes: includes.filter((id) => others.some((h) => h.id === id) && !blocked.has(id)),
      });
    } catch (err) {
      const duplicate = (err as { code?: string } | null)?.code === "23505";
      setError(
        duplicate
          ? `You already have a habit called “${trimmed}”.`
          : err instanceof Error
            ? err.message
            : "Could not save habit."
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{habit ? "Edit habit" : "New habit"}</DialogTitle>
        <DialogDescription>
          Check a habit off on each day you do it.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="habit-name">Name</Label>
          <Input
            id="habit-name"
            value={name}
            placeholder="e.g. Meditate"
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm leading-none font-medium">Weekly goal (days)</span>
          <div>
            <Segmented label="Weekly goal in days" value={goal} onChange={setGoal} options={GOAL_OPTIONS} />
          </div>
          <p className="text-xs text-muted-foreground">
            {goal === "none" ? "No goal: just track the days." : `Goal: ${formatGoalDays(Number(goal))}.`}
          </p>
        </div>
        {others.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm leading-none font-medium">Includes</span>
            <p className="text-xs text-muted-foreground">
              Checking this habit on a day also checks the ones you pick here for that day.
            </p>
            <div role="group" aria-label="Included habits" className="flex flex-wrap gap-1.5">
              {others.map((other) => {
                const selected = includes.includes(other.id) && !blocked.has(other.id);
                const disabled = blocked.has(other.id);
                return (
                  <button
                    key={other.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    title={disabled ? `${other.name} already includes this habit` : undefined}
                    onClick={() => toggleInclude(other.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
                      selected
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground enabled:hover:text-foreground"
                    )}
                  >
                    {selected && <Check className="size-3" />}
                    {other.name}
                  </button>
                );
              })}
            </div>
            {alsoChecks.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Checking it also checks: {alsoChecks.join(", ")}.
              </p>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : habit ? "Save changes" : "Add habit"}
        </Button>
      </DialogFooter>
    </form>
  );
}
