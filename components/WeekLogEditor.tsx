"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus } from "lucide-react";
import type { DataStore, Item, ItemInput, LogEntry } from "@/lib/store/types";
import { countLogsByItem } from "@/lib/macros";
import { nextTempId } from "@/lib/tempId";
import { FOOD_CATALOG } from "@/lib/foodCatalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Grace period before the "logged" list re-sorts by count, so an item
// doesn't jump position right after being clicked and cause a misclick on
// the next tap.
const RESORT_DELAY_MS = 4000;

export function WeekLogEditor({
  items,
  weekLogs,
  weekStart,
  isCurrentWeek,
  store,
  onLogsChange,
  onItemsChange,
  emptyLabel = "Nothing logged yet — search above to add an item.",
  actions,
}: {
  items: Item[];
  /** Logs already filtered down to just this week. */
  weekLogs: LogEntry[];
  weekStart: Date;
  isCurrentWeek: boolean;
  store: DataStore;
  /** Updates the full (all-weeks) log list the parent owns. */
  onLogsChange: (updater: (prev: LogEntry[]) => LogEntry[]) => void;
  /** Updates the item list the parent owns, needed when a catalog food gets imported. */
  onItemsChange: (updater: (prev: Item[]) => Item[]) => void;
  emptyLabel?: string;
  /** Rendered next to the search input, e.g. a "New item" button. */
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingCatalogName, setPendingCatalogName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => countLogsByItem(weekLogs), [weekLogs]);

  // Sort key that lags behind `counts` by RESORT_DELAY_MS, so an item
  // doesn't jump position right after being clicked and cause a misclick on
  // the next tap. Falls back to the live count for anything not in the
  // snapshot yet (a brand-new item just logged for the first time this
  // week), so newly-appearing rows still show up immediately -- only
  // *existing* rows' order is held stable.
  const [sortSnapshot, setSortSnapshot] = useState<Map<string, number>>(() => new Map());
  const resortTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(resortTimer.current);
    resortTimer.current = setTimeout(() => setSortSnapshot(new Map(counts)), RESORT_DELAY_MS);
    return () => clearTimeout(resortTimer.current);
  }, [counts]);

  const loggedItems = items
    .filter((item) => (counts.get(item.id) ?? 0) > 0)
    .sort((a, b) => {
      const aKey = sortSnapshot.get(a.id) ?? counts.get(a.id) ?? 0;
      const bKey = sortSnapshot.get(b.id) ?? counts.get(b.id) ?? 0;
      return bKey - aKey;
    });

  // Clicking outside the search input and its result lists clears the query.
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
      : items.filter((item) => item.name.toLowerCase().includes(trimmedQuery)).slice(0, 8);

  const catalogResults =
    trimmedQuery.length === 0
      ? []
      : FOOD_CATALOG.filter(
          (food) =>
            food.name.toLowerCase().includes(trimmedQuery) &&
            !items.some((item) => item.name.toLowerCase() === food.name.toLowerCase())
        ).slice(0, 8);

  async function logItem(itemId: string) {
    setPendingId(itemId);
    const tempId = nextTempId();
    // Current week: log at the real time it happened. Past week: any
    // timestamp inside that week works, since the app never shows a
    // per-day breakdown -- only which week a log falls into matters.
    const consumedAt = isCurrentWeek
      ? new Date()
      : new Date(weekStart.getTime() + 12 * 60 * 60 * 1000);
    const optimisticLog: LogEntry = {
      id: tempId,
      item_id: itemId,
      consumed_at: consumedAt.toISOString(),
    };
    onLogsChange((prev) => [...prev, optimisticLog]);

    try {
      const log = await store.logItem(itemId, consumedAt.toISOString());
      onLogsChange((prev) => prev.map((l) => (l.id === tempId ? log : l)));
    } catch {
      onLogsChange((prev) => prev.filter((l) => l.id !== tempId));
    }
    setPendingId(null);
  }

  async function unlogItem(itemId: string) {
    const mostRecent = weekLogs
      .filter((log) => log.item_id === itemId)
      .sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime())[0];
    if (!mostRecent) return;

    setPendingId(itemId);
    onLogsChange((prev) => prev.filter((l) => l.id !== mostRecent.id));

    try {
      await store.deleteLog(mostRecent.id);
    } catch {
      onLogsChange((prev) => [...prev, mostRecent]);
    }
    setPendingId(null);
  }

  async function logCatalogItem(food: ItemInput) {
    setPendingCatalogName(food.name);
    try {
      const item = await store.createItem(food);
      onItemsChange((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      await logItem(item.id);
    } finally {
      setPendingCatalogName(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search your items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {actions}
        </div>

        {searchResults.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-1">
              {searchResults.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  count={counts.get(item.id) ?? 0}
                  pending={pendingId === item.id}
                  onAdd={() => logItem(item.id)}
                  onSubtract={() => unlogItem(item.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {catalogResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">More foods</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {catalogResults.map((food) => (
                <CatalogRow
                  key={food.name}
                  food={food}
                  pending={pendingCatalogName === food.name}
                  onAdd={() => logCatalogItem(food)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {loggedItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-1">
            {loggedItems.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Separator className="my-1" />}
                <ItemRow
                  item={item}
                  count={counts.get(item.id) ?? 0}
                  pending={pendingId === item.id}
                  onAdd={() => logItem(item.id)}
                  onSubtract={() => unlogItem(item.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ItemRow({
  item,
  count,
  pending,
  onAdd,
  onSubtract,
}: {
  item: Item;
  count: number;
  pending: boolean;
  onAdd: () => void;
  onSubtract: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-accent">
      <button
        type="button"
        onClick={onAdd}
        disabled={pending}
        className="flex flex-1 flex-col items-start text-left disabled:opacity-60"
      >
        <span className="font-medium">{item.name}</span>
        <span className="text-xs text-muted-foreground">
          P{item.protein} · C{item.carbs} · F{item.fat} · {item.calories} kcal
        </span>
      </button>
      {count > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSubtract}
            disabled={pending}
            aria-label={`Remove one ${item.name}`}
            className="flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-60"
          >
            <Minus className="size-3" />
          </button>
          <Badge variant="secondary">×{count}</Badge>
        </div>
      )}
    </div>
  );
}

function CatalogRow({
  food,
  pending,
  onAdd,
}: {
  food: ItemInput;
  pending: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={pending}
      className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left hover:bg-accent disabled:opacity-60"
    >
      <span className="font-medium">{food.name}</span>
      <span className="text-xs text-muted-foreground">
        P{food.protein} · C{food.carbs} · F{food.fat} · {food.calories} kcal
      </span>
    </button>
  );
}
