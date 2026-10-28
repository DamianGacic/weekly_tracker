"use client";

import { useEffect, useMemo, useState } from "react";
import type { Movement, MovementInput, MovementLog } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";

const byName = (a: Movement, b: Movement) => a.name.localeCompare(b.name);

/** Loads the movements and their logs from the active store, shared by the movement pages. */
export function useMovementData() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    Promise.all([store.listMovements(), store.listMovementLogs()])
      .then(([loadedMovements, loadedLogs]) => {
        if (!active) return;
        setMovements(loadedMovements);
        setLogs(loadedLogs);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Could not load moves:", err);
        if (!active) return;
        setError("Couldn't load your moves. Check your connection and reload the page.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store, status, syncVersion]);

  async function createMovement(input: MovementInput) {
    const movement = await store.createMovement(input);
    setMovements((prev) => [...prev, movement].sort(byName));
    return movement;
  }

  async function updateMovement(movementId: string, input: MovementInput) {
    const updated = await store.updateMovement(movementId, input);
    setMovements((prev) => prev.map((m) => (m.id === movementId ? updated : m)).sort(byName));
    return updated;
  }

  return { store, movements, logs, setLogs, loading, error, createMovement, updateMovement };
}
