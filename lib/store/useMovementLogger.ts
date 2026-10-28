"use client";

import { useState } from "react";
import type { DataStore, MovementLog } from "@/lib/store/types";
import { nextTempId } from "@/lib/tempId";

/**
 * Logging and undoing movement logs for one week, applied optimistically to
 * the parent's log list and rolled back if the store call fails.
 */
export function useMovementLogger({
  store,
  weekLogs,
  weekStart,
  isCurrentWeek,
  onLogsChange,
}: {
  store: DataStore;
  /** Logs already filtered down to just this week. */
  weekLogs: MovementLog[];
  weekStart: Date;
  isCurrentWeek: boolean;
  /** Updates the full (all-weeks) log list the parent owns. */
  onLogsChange: (updater: (prev: MovementLog[]) => MovementLog[]) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function logMovement(movementId: string, amount: number) {
    setPendingId(movementId);
    const tempId = nextTempId();
    // Current week: log at the real time. Past week: any time inside that
    // week works, since only which week a log falls into is ever shown.
    const loggedAt = isCurrentWeek
      ? new Date()
      : new Date(weekStart.getTime() + 12 * 60 * 60 * 1000);
    const optimisticLog: MovementLog = {
      id: tempId,
      movement_id: movementId,
      amount,
      logged_at: loggedAt.toISOString(),
    };
    onLogsChange((prev) => [...prev, optimisticLog]);

    try {
      const log = await store.logMovement(movementId, amount, loggedAt.toISOString());
      onLogsChange((prev) => prev.map((l) => (l.id === tempId ? log : l)));
    } catch {
      onLogsChange((prev) => prev.filter((l) => l.id !== tempId));
    }
    setPendingId(null);
  }

  async function unlogMovement(movementId: string) {
    const mostRecent = weekLogs
      .filter((log) => log.movement_id === movementId)
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0];
    if (!mostRecent) return;

    setPendingId(movementId);
    onLogsChange((prev) => prev.filter((l) => l.id !== mostRecent.id));

    try {
      await store.deleteMovementLog(mostRecent.id);
    } catch {
      onLogsChange((prev) => [...prev, mostRecent]);
    }
    setPendingId(null);
  }

  return { pendingId, logMovement, unlogMovement };
}
