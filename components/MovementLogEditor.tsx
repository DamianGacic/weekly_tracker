"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Hash, Minus, Timer } from "lucide-react";
import type { DataStore, Movement, MovementLog } from "@/lib/store/types";
import { KINDS, KIND_LABELS, formatMovementAmount, totalsByMovement } from "@/lib/movement";
import { useLaggedSnapshot } from "@/lib/useLaggedSnapshot";
import { useMovementLogger } from "@/lib/store/useMovementLogger";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MovementAmountDialog } from "@/components/MovementAmountDialog";
import { ROUND_BUTTON } from "@/components/WeekLogEditor";

// Same grace period as the macro list before rows re-sort after a tap.
const RESORT_DELAY_MS = 4000;

export function MovementLogEditor({
  movements,
  weekLogs,
  weekStart,
  isCurrentWeek,
  store,
  onLogsChange,
  emptyLabel = "Nothing logged yet — search above to add a move.",
  actions,
}: {
  movements: Movement[];
  /** Logs already filtered down to just this week. */
  weekLogs: MovementLog[];
  weekStart: Date;
  isCurrentWeek: boolean;
  store: DataStore;
  /** Updates the full (all-weeks) log list the parent owns. */
  onLogsChange: (updater: (prev: MovementLog[]) => MovementLog[]) => void;
  emptyLabel?: string;
  /** Rendered next to the search input, e.g. a "New move" button. */
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const { pendingId, logMovement, unlogMovement } = useMovementLogger({
    store,
    weekLogs,
    weekStart,
    isCurrentWeek,
    onLogsChange,
  });
  const [customMovement, setCustomMovement] = useState<Movement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(() => totalsByMovement(weekLogs), [weekLogs]);
  // Sort key: the week's total, lagging behind by RESORT_DELAY_MS.
  const sortSnapshot = useLaggedSnapshot(totals, RESORT_DELAY_MS);
  const sortKey = (movement: Movement) =>
    sortSnapshot.get(movement.id) ?? totals.get(movement.id) ?? 0;

  // Each kind sorted by its own total: reps and seconds don't compare.
  const groups = KINDS.map((kind) => ({
    kind,
    rows: movements
      .filter((movement) => movement.kind === kind && (totals.get(movement.id) ?? 0) > 0)
      .sort((a, b) => sortKey(b) - sortKey(a)),
  })).filter((group) => group.rows.length > 0);

  // Clicking outside the search input and its results clears the query.
  useEffect(() => {
    if (query.trim().length === 0) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [query]);

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults =
    trimmedQuery.length === 0
      ? []
      : movements.filter((movement) => movement.name.toLowerCase().includes(trimmedQuery)).slice(0, 8);

  function openCustom(movement: Movement) {
    setCustomMovement(movement);
    setCustomOpen(true);
  }

  function row(movement: Movement, showKind: boolean) {
    return (
      <MovementRow
        movement={movement}
        total={totals.get(movement.id) ?? 0}
        showKind={showKind}
        pending={pendingId === movement.id}
        onAdd={() => logMovement(movement.id, movement.default_amount)}
        onSubtract={() => unlogMovement(movement.id)}
        onCustom={() => openCustom(movement)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search your moves…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {actions}
        </div>

        {searchResults.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-1">
              {searchResults.map((movement) => (
                <div key={movement.id}>{row(movement, true)}</div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-1">
            {groups.map(({ kind, rows }, groupIndex) => (
              <div key={kind} className="flex flex-col gap-1">
                {groupIndex > 0 && <Separator className="my-2" />}
                <span className="px-2 text-xs font-medium text-muted-foreground">
                  {KIND_LABELS[kind].many}
                </span>
                {rows.map((movement, i) => (
                  <div key={movement.id}>
                    {i > 0 && <Separator className="my-1" />}
                    {row(movement, false)}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <MovementAmountDialog
        movement={customMovement}
        open={customOpen}
        onOpenChange={setCustomOpen}
        onLog={(amount) => customMovement && logMovement(customMovement.id, amount)}
      />
    </div>
  );
}

function MovementRow({
  movement,
  total,
  showKind,
  pending,
  onAdd,
  onSubtract,
  onCustom,
}: {
  movement: Movement;
  /** Amount logged this week. */
  total: number;
  /** Say whether it's a move or a position (search results mix both). */
  showKind: boolean;
  pending: boolean;
  onAdd: () => void;
  onSubtract: () => void;
  onCustom: () => void;
}) {
  const CustomIcon = movement.kind === "time" ? Timer : Hash;
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-accent">
      <button
        type="button"
        onClick={onAdd}
        disabled={pending}
        className="flex min-w-0 flex-1 flex-col items-start text-left disabled:opacity-60"
      >
        <span className="font-medium">{movement.name}</span>
        <span className="text-xs text-muted-foreground">
          {showKind && `${KIND_LABELS[movement.kind].one} · `}+
          {formatMovementAmount(movement.kind, movement.default_amount)} per tap
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {total > 0 && (
          <>
            <button
              type="button"
              onClick={onSubtract}
              disabled={pending}
              aria-label={`Undo the last ${movement.name} you logged`}
              className={ROUND_BUTTON}
            >
              <Minus className="size-3" />
            </button>
            <Badge variant="secondary">{formatMovementAmount(movement.kind, total)}</Badge>
          </>
        )}
        <button
          type="button"
          onClick={onCustom}
          disabled={pending}
          aria-label={`Log a custom amount of ${movement.name}`}
          title="Log a custom amount"
          className={ROUND_BUTTON}
        >
          <CustomIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
