"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus } from "lucide-react";
import type {
  DataStore,
  Item,
  ItemInput,
  LogEntry,
  RawMacroEntry,
  RawMacroInput,
} from "@/lib/store/types";
import { macrosFor, portionsByItem } from "@/lib/macros";
import { formatAmount } from "@/lib/number";
import { nextTempId } from "@/lib/tempId";
import { useLaggedSnapshot } from "@/lib/useLaggedSnapshot";
import { FOOD_CATALOG } from "@/lib/foodCatalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MacroLine, MacroPie } from "@/components/MacroSplit";
import { PortionDialog } from "@/components/PortionDialog";
import { RawMacroDialog } from "@/components/RawMacroDialog";
import { SaveError } from "@/components/SaveError";

// Grace period before the "logged" list re-sorts by calories, so an item
// doesn't jump position right after being clicked and cause a misclick on
// the next tap.
const RESORT_DELAY_MS = 4000;

export function WeekLogEditor({
  items,
  weekLogs,
  weekRawMacros,
  weekStart,
  isCurrentWeek,
  store,
  onLogsChange,
  onRawMacrosChange,
  onItemsChange,
  emptyLabel = "Nothing logged yet — search above to add an item.",
  actions,
  showStaples = false,
}: {
  items: Item[];
  /** Logs already filtered down to just this week. */
  weekLogs: LogEntry[];
  /** Additional raw macros already filtered down to just this week. */
  weekRawMacros: RawMacroEntry[];
  weekStart: Date;
  isCurrentWeek: boolean;
  store: DataStore;
  /** Updates the full (all-weeks) log list the parent owns. */
  onLogsChange: (updater: (prev: LogEntry[]) => LogEntry[]) => void;
  /** Updates the full (all-weeks) raw macro list the parent owns. */
  onRawMacrosChange: (updater: (prev: RawMacroEntry[]) => RawMacroEntry[]) => void;
  /** Updates the item list the parent owns, needed when a catalog food gets imported. */
  onItemsChange: (updater: (prev: Item[]) => Item[]) => void;
  emptyLabel?: string;
  /** Rendered next to the search input, e.g. a "New item" button. */
  actions?: ReactNode;
  /** Show the Staples block: staple items not logged this week yet, one tap away. */
  showStaples?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingCatalogName, setPendingCatalogName] = useState<string | null>(null);
  const [partialItem, setPartialItem] = useState<Item | null>(null);
  const [partialOpen, setPartialOpen] = useState(false);
  // Shown when a change didn't reach the store and was undone on screen, so
  // that it never goes unnoticed.
  const [saveError, setSaveError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const portions = useMemo(() => portionsByItem(weekLogs), [weekLogs]);
  const caloriesByItem = useMemo(
    () => new Map(items.map((item) => [item.id, macrosFor(item, portions.get(item.id) ?? 0).calories])),
    [items, portions]
  );

  // Sort key: the item's calories this week, lagging behind by RESORT_DELAY_MS.
  const sortSnapshot = useLaggedSnapshot(caloriesByItem, RESORT_DELAY_MS);

  const loggedItems = items
    .filter((item) => (portions.get(item.id) ?? 0) > 0)
    .sort((a, b) => {
      const aKey = sortSnapshot.get(a.id) ?? caloriesByItem.get(a.id) ?? 0;
      const bKey = sortSnapshot.get(b.id) ?? caloriesByItem.get(b.id) ?? 0;
      return bKey - aKey;
    });

  // Once logged, a staple joins the list above instead.
  const unloggedStaples = items
    .filter((item) => item.staple && (portions.get(item.id) ?? 0) === 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const hasStaples = items.some((item) => item.staple);

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

  // Current week: log at the real time it happened. Past week: any
  // timestamp inside that week works, since the app never shows a
  // per-day breakdown -- only which week a log falls into matters.
  function logTimestamp() {
    return isCurrentWeek ? new Date() : new Date(weekStart.getTime() + 12 * 60 * 60 * 1000);
  }

  async function logItem(itemId: string, amount = 1) {
    setPendingId(itemId);
    const tempId = nextTempId();
    const consumedAt = logTimestamp();
    const optimisticLog: LogEntry = {
      id: tempId,
      item_id: itemId,
      consumed_at: consumedAt.toISOString(),
      amount,
    };
    onLogsChange((prev) => [...prev, optimisticLog]);

    try {
      const log = await store.logItem(itemId, consumedAt.toISOString(), amount);
      onLogsChange((prev) => prev.map((l) => (l.id === tempId ? log : l)));
      setSaveError(null);
    } catch (err) {
      console.error("Could not log item:", err);
      onLogsChange((prev) => prev.filter((l) => l.id !== tempId));
      setSaveError(`Couldn't save that, so ${itemName(itemId)} wasn't logged. Check your connection and try again.`);
    }
    setPendingId(null);
  }

  function itemName(itemId: string) {
    return items.find((item) => item.id === itemId)?.name ?? "it";
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
      setSaveError(null);
    } catch (err) {
      console.error("Could not undo log:", err);
      onLogsChange((prev) => [...prev, mostRecent]);
      setSaveError(`Couldn't undo that, so ${itemName(itemId)} is still logged. Check your connection and try again.`);
    }
    setPendingId(null);
  }

  async function logCatalogItem(food: ItemInput) {
    setPendingCatalogName(food.name);
    try {
      const item = await store.createItem(food);
      onItemsChange((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      await logItem(item.id);
    } catch (err) {
      console.error("Could not add food:", err);
      setSaveError(`Couldn't add ${food.name}, so it wasn't logged. Check your connection and try again.`);
    } finally {
      setPendingCatalogName(null);
    }
  }

  // Not optimistic: the dialog stays open and shows the error if this throws.
  async function addRawMacros(input: RawMacroInput) {
    const entry = await store.addRawMacros(input, logTimestamp().toISOString());
    onRawMacrosChange((prev) => [...prev, entry]);
  }

  async function removeRawMacros(entry: RawMacroEntry) {
    onRawMacrosChange((prev) => prev.filter((e) => e.id !== entry.id));
    try {
      await store.deleteRawMacros(entry.id);
      setSaveError(null);
    } catch (err) {
      console.error("Could not remove raw macros:", err);
      onRawMacrosChange((prev) => [...prev, entry]);
      setSaveError("Couldn't remove those raw macros, so they're still counted. Check your connection and try again.");
    }
  }

  function openPartial(item: Item) {
    setPartialItem(item);
    setPartialOpen(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <SaveError message={saveError} />
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
                  portions={portions.get(item.id) ?? 0}
                  showTotals={false}
                  pending={pendingId === item.id}
                  onAdd={() => logItem(item.id)}
                  onSubtract={() => unlogItem(item.id)}
                  onPartial={() => openPartial(item)}
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

      <RawMacrosCard entries={weekRawMacros} onAdd={addRawMacros} onRemove={removeRawMacros} />

      {loggedItems.length === 0 ? (
        weekRawMacros.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-1">
            {loggedItems.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Separator className="my-1" />}
                <ItemRow
                  item={item}
                  portions={portions.get(item.id) ?? 0}
                  showTotals
                  pending={pendingId === item.id}
                  onAdd={() => logItem(item.id)}
                  onSubtract={() => unlogItem(item.id)}
                  onPartial={() => openPartial(item)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showStaples && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Staples</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {unloggedStaples.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                {hasStaples ? (
                  "All your staples are logged this week."
                ) : (
                  <>
                    No staples yet — tick the ones you eat often in{" "}
                    <Link href="/items" className="underline underline-offset-2">
                      Your items
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : (
              unloggedStaples.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <Separator className="my-1" />}
                  <ItemRow
                    item={item}
                    portions={0}
                    showTotals={false}
                    pending={pendingId === item.id}
                    onAdd={() => logItem(item.id)}
                    onSubtract={() => unlogItem(item.id)}
                    onPartial={() => openPartial(item)}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <PortionDialog
        item={partialItem}
        open={partialOpen}
        onOpenChange={setPartialOpen}
        onLog={(amount) => partialItem && logItem(partialItem.id, amount)}
      />
    </div>
  );
}

export const ROUND_BUTTON =
  "flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-60";

function RawMacrosCard({
  entries,
  onAdd,
  onRemove,
}: {
  entries: RawMacroEntry[];
  onAdd: (input: RawMacroInput) => Promise<void>;
  onRemove: (entry: RawMacroEntry) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Additional raw macros</CardTitle>
          <RawMacroDialog onAdd={onAdd} />
        </div>
      </CardHeader>
      {entries.length > 0 && (
        <CardContent className="flex flex-col gap-1">
          {entries.map((entry, i) => (
            <div key={entry.id}>
              {i > 0 && <Separator className="my-1" />}
              <div className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <MacroPie macros={entry} />
                  <MacroLine macros={entry} />
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(entry)}
                  aria-label="Remove these raw macros"
                  title="Remove"
                  className={ROUND_BUTTON}
                >
                  <Minus className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function ItemRow({
  item,
  portions,
  showTotals,
  pending,
  onAdd,
  onSubtract,
  onPartial,
}: {
  item: Item;
  /** Portions logged this week. */
  portions: number;
  /** Show the macros for everything logged this week rather than for one portion. */
  showTotals: boolean;
  pending: boolean;
  onAdd: () => void;
  onSubtract: () => void;
  onPartial: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-accent">
      <button
        type="button"
        onClick={onAdd}
        disabled={pending}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:opacity-60"
      >
        <MacroPie macros={item} />
        <span className="flex min-w-0 flex-col items-start">
          <span className="font-medium">{item.name}</span>
          <MacroLine macros={macrosFor(item, showTotals ? portions : 1)} />
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {portions > 0 && (
          <>
            <button
              type="button"
              onClick={onSubtract}
              disabled={pending}
              aria-label={`Undo the last ${item.name} you logged`}
              className={ROUND_BUTTON}
            >
              <Minus className="size-3" />
            </button>
            <Badge variant="secondary">×{formatAmount(portions)}</Badge>
          </>
        )}
        <button
          type="button"
          onClick={onPartial}
          disabled={pending}
          aria-label={`Log a partial amount of ${item.name}`}
          title="Log a partial amount"
          className={`${ROUND_BUTTON} text-[10px] leading-none`}
        >
          ½
        </button>
      </div>
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
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent disabled:opacity-60"
    >
      <MacroPie macros={food} />
      <span className="flex min-w-0 flex-col items-start">
        <span className="font-medium">{food.name}</span>
        <MacroLine macros={food} />
      </span>
    </button>
  );
}
