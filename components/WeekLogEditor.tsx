"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Minus } from "lucide-react";
import type { DataStore, Item, LogEntry } from "@/lib/store/types";
import { countLogsByItem } from "@/lib/macros";
import { nextTempId } from "@/lib/tempId";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function WeekLogEditor({
  items,
  weekLogs,
  weekStart,
  isCurrentWeek,
  store,
  onLogsChange,
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
  emptyLabel?: string;
  /** Rendered next to the search input, e.g. a "New item" button. */
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const counts = useMemo(() => countLogsByItem(weekLogs), [weekLogs]);

  const loggedItems = items
    .filter((item) => (counts.get(item.id) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

  const searchResults =
    query.trim().length === 0
      ? []
      : items
          .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 8);

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

  return (
    <div className="flex flex-col gap-3">
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
