"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Habit, HabitCheck, HabitInput } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { toggleHabit } from "@/lib/habits";

const byName = (a: Habit, b: Habit) => a.name.localeCompare(b.name);

/** Loads habits and their checks from the active store, shared by the habit pages. */
export function useHabitData() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [checks, setChecks] = useState<HabitCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Days with a save in flight. A day's next tap waits for it, since what a
  // tap changes is worked out from that day's checks, which could still be
  // rolled back. The ref is the guard, the state is for showing it.
  const pendingRef = useRef(new Set<string>());
  const [pendingDays, setPendingDays] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    Promise.all([store.listHabits(), store.listHabitChecks()])
      .then(([loadedHabits, loadedChecks]) => {
        if (!active) return;
        setHabits(loadedHabits);
        setChecks(loadedChecks);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Could not load habits:", err);
        if (!active) return;
        setError("Couldn't load your habits. Check your connection and reload the page.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store, status, syncVersion]);

  async function createHabit(input: HabitInput) {
    const habit = await store.createHabit(input);
    setHabits((prev) => [...prev, habit].sort(byName));
    return habit;
  }

  async function updateHabit(habitId: string, input: HabitInput) {
    const updated = await store.updateHabit(habitId, input);
    setHabits((prev) => prev.map((h) => (h.id === habitId ? updated : h)).sort(byName));
    return updated;
  }

  function setPending(day: string, pending: boolean) {
    if (pending) pendingRef.current.add(day);
    else pendingRef.current.delete(day);
    setPendingDays(new Set(pendingRef.current));
  }

  /** Checks or unchecks `habitId` on `day`, with the habits it includes (see `toggleHabit`). */
  async function toggle(habitId: string, day: string) {
    if (pendingRef.current.has(day)) return;
    const { add, remove } = toggleHabit(
      habits,
      checks.filter((check) => check.day === day),
      habitId,
      day
    );
    const inList = (list: HabitCheck[]) => (check: HabitCheck) =>
      check.day === day && list.some((other) => other.habit_id === check.habit_id);

    setPending(day, true);
    setChecks((prev) => [...prev.filter((check) => !inList(remove)(check)), ...add]);
    try {
      await store.addHabitChecks(add);
      await store.removeHabitChecks(day, remove.map((check) => check.habit_id));
      setSaveError(null);
    } catch (err) {
      console.error("Could not save habit check:", err);
      setChecks((prev) => [...prev.filter((check) => !inList(add)(check)), ...remove]);
      setSaveError("Couldn't save that. Check your connection and try again.");
    }
    setPending(day, false);
  }

  return {
    habits,
    checks,
    loading,
    error,
    saveError,
    pendingDays,
    createHabit,
    updateHabit,
    toggle,
  };
}
