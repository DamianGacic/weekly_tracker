import { useEffect, useRef, useState } from "react";

/**
 * A copy of `values` that only catches up once they've stopped changing for
 * `delayMs`. Used as a list's sort key, so a row doesn't jump position right
 * after being clicked and cause a misclick on the next tap. Starts empty:
 * callers fall back to the live value for anything not in the snapshot yet,
 * so newly-appearing rows still show up immediately -- only *existing* rows'
 * order is held stable.
 */
export function useLaggedSnapshot<K, V>(values: Map<K, V>, delayMs: number): Map<K, V> {
  const [snapshot, setSnapshot] = useState<Map<K, V>>(() => new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSnapshot(new Map(values)), delayMs);
    return () => clearTimeout(timer.current);
  }, [values, delayMs]);

  return snapshot;
}
