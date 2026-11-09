"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lift, LiftInput, LiftSet } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { normalizeGoal } from "@/lib/lifts";

const byName = (a: Lift, b: Lift) => a.name.localeCompare(b.name);

/** Loads the lifts and their sets from the active store, shared by the lift pages. */
export function useLiftData() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [lifts, setLifts] = useState<Lift[]>([]);
  const [sets, setSets] = useState<LiftSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    Promise.all([store.listLifts(), store.listLiftSets()])
      .then(([loadedLifts, loadedSets]) => {
        if (!active) return;
        setLifts(loadedLifts);
        setSets(loadedSets);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Could not load lifts:", err);
        if (!active) return;
        setError("Couldn't load your lifts. Check your connection and reload the page.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store, status, syncVersion]);

  async function createLift(input: LiftInput) {
    const lift = await store.createLift({ ...input, goal: normalizeGoal(input.goal) });
    setLifts((prev) => [...prev, lift].sort(byName));
    return lift;
  }

  async function updateLift(liftId: string, input: LiftInput) {
    const updated = await store.updateLift(liftId, { ...input, goal: normalizeGoal(input.goal) });
    setLifts((prev) => prev.map((l) => (l.id === liftId ? updated : l)).sort(byName));
    return updated;
  }

  return { store, lifts, sets, setSets, loading, error, createLift, updateLift };
}
