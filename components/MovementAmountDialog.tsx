"use client";

import { useState, type FormEvent } from "react";
import type { Movement, MovementKind } from "@/lib/store/types";
import { formatMovementAmount, parseDuration } from "@/lib/movement";
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
} from "@/components/ui/dialog";

/** Reps, or seconds for a position. */
const PRESETS: Record<MovementKind, number[]> = {
  reps: [5, 10, 15, 20, 30, 50],
  time: [30, 45, 60, 90, 120, 300],
};

/** Logs any amount of a move or position: a preset in one tap, or a typed amount. */
export function MovementAmountDialog({
  movement,
  open,
  onOpenChange,
  onLog,
}: {
  /** Kept set while closing, so the content doesn't vanish mid-animation. */
  movement: Movement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLog: (amount: number) => void;
}) {
  const [custom, setCustom] = useState("");
  const kind = movement?.kind ?? "reps";
  const amount = kind === "time" ? parseDuration(custom) : parseDecimal(custom);
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
        {movement && (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Log a custom amount</DialogTitle>
              <DialogDescription>
                How much {movement.name}? One tap logs{" "}
                {formatMovementAmount(kind, movement.default_amount)}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS[kind].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    className="min-w-11"
                    onClick={() => log(preset)}
                  >
                    {kind === "reps" ? preset : formatMovementAmount(kind, preset)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="movement-amount">
                  {kind === "reps" ? "Other amount, in reps" : "Other amount (seconds, or m:ss)"}
                </Label>
                <Input
                  id="movement-amount"
                  type="text"
                  inputMode={kind === "reps" ? "decimal" : "text"}
                  placeholder={kind === "reps" ? "e.g. 12" : "e.g. 75 or 1:15"}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!valid}>
                {valid ? `Log ${formatMovementAmount(kind, amount)}` : "Log"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
