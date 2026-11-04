"use client";

import { useState, type FormEvent } from "react";
import type { RawMacroInput } from "@/lib/store/types";
import { caloriesFor, round1 } from "@/lib/macros";
import { parseDecimal } from "@/lib/number";
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
import { MacroLine } from "@/components/MacroSplit";

/** Adds macros to a week without an item. Every field is optional, as long as something is filled in. */
export function RawMacroDialog({ onAdd }: { onAdd: (input: RawMacroInput) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grams = {
    protein: parseDecimal(protein),
    carbs: parseDecimal(carbs),
    fat: parseDecimal(fat),
  };
  const suggestedCalories = round1(caloriesFor(grams.protein, grams.carbs, grams.fat));
  const entry: RawMacroInput = {
    ...grams,
    calories: calories.trim() === "" ? suggestedCalories : parseDecimal(calories),
  };
  const values = Object.values(entry);
  const valid = values.every((value) => value >= 0) && values.some((value) => value > 0);

  function reset() {
    setProtein("");
    setCarbs("");
    setFat("");
    setCalories("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);

    try {
      await onAdd(entry);
      reset();
      setOpen(false);
    } catch (err) {
      console.error("Could not add raw macros:", err);
      setError("Couldn't add these — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Add</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add raw macros</DialogTitle>
            <DialogDescription>
              Counted toward the week without an item, for exceptions and rare foods. Fill in what
              you know. Leave calories blank to use the value calculated from protein/carbs/fat.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="raw-calories">Calories (kcal)</Label>
              <Input
                id="raw-calories"
                type="text"
                inputMode="decimal"
                placeholder={`${suggestedCalories} (from macros)`}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="raw-protein">Protein (g)</Label>
                <Input
                  id="raw-protein"
                  type="text"
                  inputMode="decimal"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="raw-carbs">Carbs (g)</Label>
                <Input
                  id="raw-carbs"
                  type="text"
                  inputMode="decimal"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="raw-fat">Fat (g)</Label>
                <Input
                  id="raw-fat"
                  type="text"
                  inputMode="decimal"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>
            </div>
            {valid && <MacroLine macros={entry} />}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? "Adding…" : "Add to week"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
