"use client";

import { useState, type FormEvent } from "react";
import type { Item } from "@/lib/store/types";
import { macrosFor } from "@/lib/macros";
import { formatAmount, parseDecimal } from "@/lib/number";
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
import { MacroLine } from "@/components/MacroSplit";

const PRESETS = [
  { label: "¼", amount: 0.25 },
  { label: "⅓", amount: 1 / 3 },
  { label: "½", amount: 0.5 },
  { label: "¾", amount: 0.75 },
  { label: "1½", amount: 1.5 },
  { label: "2", amount: 2 },
];

function portionsLabel(amount: number) {
  return `${formatAmount(amount)} ${amount === 1 ? "portion" : "portions"}`;
}

/** Logs a fraction (or multiple) of an item's portion: a preset in one tap, or any typed amount. */
export function PortionDialog({
  item,
  open,
  onOpenChange,
  onLog,
}: {
  /** Kept set while closing, so the content doesn't vanish mid-animation. */
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLog: (amount: number) => void;
}) {
  const [custom, setCustom] = useState("");
  const amount = parseDecimal(custom);
  const valid = amount > 0;

  function log(value: number) {
    onLog(value);
    onOpenChange(false);
    setCustom("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) log(amount);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setCustom("");
      }}
    >
      <DialogContent>
        {item && (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Log a partial amount</DialogTitle>
              <DialogDescription>How much {item.name}? One portion is:</DialogDescription>
              <MacroLine macros={macrosFor(item, 1)} />
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    className="min-w-11"
                    title={`Log ${portionsLabel(preset.amount)}`}
                    onClick={() => log(preset.amount)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="portion-amount">Other amount, in portions</Label>
                <Input
                  id="portion-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 0,4"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
                {valid && <MacroLine macros={macrosFor(item, amount)} />}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!valid}>
                {valid ? `Log ${portionsLabel(amount)}` : "Log"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
