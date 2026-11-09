"use client";

import { useState } from "react";
import type { DataStore, LiftSet } from "@/lib/store/types";
import { newestFirst, sameSpec, type SetSpec } from "@/lib/lifts";
import { getWeekEnd } from "@/lib/week";
import { nextTempId } from "@/lib/tempId";

const HOUR_MS = 60 * 60 * 1000;

/**
 * When a set added to a past week is logged: Monday noon for the week's
 * first, then a second after the week's latest set, so "the last set" (what
 * the repeat button offers) still means the one added last.
 */
function pastWeekLoggedAt(weekStart: Date, weekSets: LiftSet[]): Date {
  const latest = Math.max(
    weekStart.getTime() + 12 * HOUR_MS - 1000,
    ...weekSets.map((set) => new Date(set.logged_at).getTime())
  );
  return new Date(Math.min(latest + 1000, getWeekEnd(weekStart).getTime() - 1000));
}

/**
 * Logging and removing sets for one week, applied optimistically to the
 * parent's set list and rolled back if the store call fails.
 */
export function useLiftLogger({
  store,
  weekSets,
  weekStart,
  isCurrentWeek,
  onSetsChange,
}: {
  store: DataStore;
  /** Sets already filtered down to just this week. */
  weekSets: LiftSet[];
  weekStart: Date;
  isCurrentWeek: boolean;
  /** Updates the full (all-weeks) set list the parent owns. */
  onSetsChange: (updater: (prev: LiftSet[]) => LiftSet[]) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  /** Logs `count` sets of `spec` for the lift. */
  async function logSets(liftId: string, spec: SetSpec, count = 1) {
    setPendingId(liftId);
    const loggedAt = (isCurrentWeek ? new Date() : pastWeekLoggedAt(weekStart, weekSets)).toISOString();
    const tempIds = new Set(Array.from({ length: count }, () => nextTempId()));
    const optimistic: LiftSet[] = [...tempIds].map((id) => ({
      id,
      lift_id: liftId,
      weight: spec.weight,
      reps: spec.reps,
      logged_at: loggedAt,
    }));
    onSetsChange((prev) => [...prev, ...optimistic]);

    try {
      const saved = await store.logLiftSets(liftId, spec, count, loggedAt);
      onSetsChange((prev) => [...prev.filter((s) => !tempIds.has(s.id)), ...saved]);
    } catch (err) {
      console.error("Could not log sets:", err);
      onSetsChange((prev) => prev.filter((s) => !tempIds.has(s.id)));
    }
    setPendingId(null);
  }

  /** Removes this week's most recent set of the lift with exactly `spec`'s weight and reps. */
  async function removeSet(liftId: string, spec: SetSpec) {
    const mostRecent = weekSets
      .filter((set) => set.lift_id === liftId && sameSpec(set, spec))
      .sort(newestFirst)[0];
    if (!mostRecent) return;

    setPendingId(liftId);
    onSetsChange((prev) => prev.filter((s) => s.id !== mostRecent.id));

    try {
      await store.deleteLiftSet(mostRecent.id);
    } catch (err) {
      console.error("Could not remove set:", err);
      onSetsChange((prev) => [...prev, mostRecent]);
    }
    setPendingId(null);
  }

  return { pendingId, logSets, removeSet };
}
