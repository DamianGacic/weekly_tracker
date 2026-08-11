"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
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

type ItemDialogProps =
  | { mode: "create"; item?: undefined; onSave: (input: ItemInput) => Promise<Item> }
  | { mode: "edit"; item: Item; onSave: (input: ItemInput) => Promise<Item> };

export function ItemDialog({ mode, item, onSave }: ItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.name ?? "");
  const [protein, setProtein] = useState(item ? String(item.protein) : "");
  const [carbs, setCarbs] = useState(item ? String(item.carbs) : "");
  const [fat, setFat] = useState(item ? String(item.fat) : "");
  const [calories, setCalories] = useState(item ? String(item.calories) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedCalories = caloriesFor(
    parseDecimal(protein),
    parseDecimal(carbs),
    parseDecimal(fat)
  );

  function reset() {
    setName(item?.name ?? "");
    setProtein(item ? String(item.protein) : "");
    setCarbs(item ? String(item.carbs) : "");
    setFat(item ? String(item.fat) : "");
    setCalories(item ? String(item.calories) : "");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        protein: parseDecimal(protein),
        carbs: parseDecimal(carbs),
        fat: parseDecimal(fat),
        calories: calories === "" ? round1(suggestedCalories) : parseDecimal(calories),
      });
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item.");
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
      {mode === "create" ? (
        <DialogTrigger render={<Button variant="outline" />}>New item</DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${item.name}`}
            />
          }
        >
          <Pencil className="size-3.5" />
        </DialogTrigger>
      )}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "New item" : "Edit item"}</DialogTitle>
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
              {saving ? "Saving…" : mode === "create" ? "Add item" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
