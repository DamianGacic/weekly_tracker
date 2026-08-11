"use client";

import { useState, type FormEvent } from "react";
import type { Item, ItemInput } from "@/lib/store/types";
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

export function NewItemDialog({ onCreate }: { onCreate: (input: ItemInput) => Promise<Item> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedCalories = caloriesFor(
    parseDecimal(protein),
    parseDecimal(carbs),
    parseDecimal(fat)
  );

  function reset() {
    setName("");
    setProtein("");
    setCarbs("");
    setFat("");
    setCalories("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onCreate({
        name: name.trim(),
        protein: parseDecimal(protein),
        carbs: parseDecimal(carbs),
        fat: parseDecimal(fat),
        calories: calories === "" ? round1(suggestedCalories) : parseDecimal(calories),
      });
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create item.");
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
      <DialogTrigger render={<Button variant="outline" />}>New item</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New item</DialogTitle>
            <DialogDescription>
              Macros in grams per serving. Leave calories blank to use the value calculated from
              protein/carbs/fat.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-calories">Calories (kcal)</Label>
              <Input
                id="item-calories"
                type="text"
                inputMode="decimal"
                placeholder={`${round1(suggestedCalories)} (from macros)`}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-protein">Protein (g)</Label>
                <Input
                  id="item-protein"
                  type="text"
                  inputMode="decimal"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-carbs">Carbs (g)</Label>
                <Input
                  id="item-carbs"
                  type="text"
                  inputMode="decimal"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-fat">Fat (g)</Label>
                <Input
                  id="item-fat"
                  type="text"
                  inputMode="decimal"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
