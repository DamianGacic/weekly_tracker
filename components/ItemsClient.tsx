"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, ItemInput } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { macrosFor } from "@/lib/macros";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ItemDialog } from "@/components/ItemDialog";
import { MacroLine, MacroPie } from "@/components/MacroSplit";
import { Segmented } from "@/components/GoalFields";

type SortKey = "name" | "newest" | "calories" | "protein" | "carbs" | "fat";

const SORTS: { key: SortKey; label: string; compare: (a: Item, b: Item) => number }[] = [
  { key: "name", label: "Name (A–Z)", compare: (a, b) => a.name.localeCompare(b.name) },
  { key: "newest", label: "Newest first", compare: (a, b) => b.created_at.localeCompare(a.created_at) },
  { key: "calories", label: "Most calories", compare: (a, b) => b.calories - a.calories },
  { key: "protein", label: "Most protein", compare: (a, b) => b.protein - a.protein },
  { key: "carbs", label: "Most carbs", compare: (a, b) => b.carbs - a.carbs },
  { key: "fat", label: "Most fat", compare: (a, b) => b.fat - a.fat },
];

export function ItemsClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [filter, setFilter] = useState<"all" | "staples">("all");

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    store.listItems().then((loadedItems) => {
      if (!active) return;
      setItems(loadedItems);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [store, status, syncVersion]);

  async function handleCreateItem(input: ItemInput) {
    const item = await store.createItem(input);
    setItems((prev) => [...prev, item]);
    return item;
  }

  async function handleUpdateItem(itemId: string, input: ItemInput) {
    const updated = await store.updateItem(itemId, input);
    setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
    return updated;
  }

  async function handleToggleStaple(item: Item, staple: boolean) {
    const setStaple = (value: boolean) =>
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, staple: value } : i)));
    setStaple(staple);
    try {
      await store.setItemStaple(item.id, staple);
    } catch (err) {
      console.error("Could not update staple:", err);
      setStaple(!staple);
    }
  }

  const trimmedQuery = query.trim().toLowerCase();
  const compare = SORTS.find((s) => s.key === sort)!.compare;
  const shownItems = items
    .filter((item) => filter === "all" || item.staple)
    .filter((item) => item.name.toLowerCase().includes(trimmedQuery))
    .sort((a, b) => compare(a, b) || a.name.localeCompare(b.name));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your items</h1>
        <ItemDialog mode="create" onSave={handleCreateItem} />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items yet — add your first one above.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={filter === "staples" ? "Search your staples…" : "Search your items…"}
                aria-label="Search your items"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="Sort items"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-8 shrink-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Segmented
                label="Show"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All items" },
                  { value: "staples", label: "Staples only" },
                ]}
              />
              <span className="text-xs text-muted-foreground">
                {shownItems.length} of {items.length}
              </span>
            </div>
          </div>
          {shownItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filter === "staples" && trimmedQuery === ""
                ? "No staples yet — tick Staple on the items you eat often, and they'll show up on This week until you log them."
                : "No matching items."}
            </p>
          ) : (
            <Card>
              <CardContent className="flex flex-col gap-1">
                {shownItems.map((item, i) => (
                  <div key={item.id}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="flex items-center justify-between gap-2 px-2 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <MacroPie macros={item} />
                        <div className="flex min-w-0 flex-col">
                          <span className="font-medium">{item.name}</span>
                          <MacroLine macros={macrosFor(item, 1)} />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <label className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={item.staple}
                            aria-label={`Staple: ${item.name}`}
                            onChange={(e) => handleToggleStaple(item, e.target.checked)}
                            className="size-3.5 accent-foreground"
                          />
                          Staple
                        </label>
                        <ItemDialog
                          mode="edit"
                          item={item}
                          onSave={(input) => handleUpdateItem(item.id, input)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
