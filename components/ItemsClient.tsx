"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, ItemInput } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NewItemDialog } from "@/components/NewItemDialog";

export function ItemsClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

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
    setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    return item;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your items</h1>
        <NewItemDialog onCreate={handleCreateItem} />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items yet — add your first one above.
        </p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-1">
            {items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    P{item.protein} · C{item.carbs} · F{item.fat} · {item.calories} kcal
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
