import { createClient } from "@/lib/supabase/client";
import { localStore, clearLocalData } from "@/lib/store/local";

/**
 * One-time upload of locally-tracked items/logs into a freshly signed-in
 * account. Only runs if the account has no items yet, so it's safe to call
 * on every sign-in without duplicating data on a second device or a re-login.
 * Local data is only cleared once every item migrated successfully, so a
 * partial failure (e.g. a name collision) leaves the source data intact
 * instead of silently dropping it.
 */
export async function migrateLocalDataToRemote(): Promise<void> {
  const supabase = createClient();

  const { count } = await supabase.from("items").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const localItems = await localStore.listItems();
  if (localItems.length === 0) return;
  const localLogs = await localStore.listLogs();

  const idMap = new Map<string, string>();
  let hadFailure = false;
  for (const item of localItems) {
    const { data, error } = await supabase
      .from("items")
      .insert({
        name: item.name,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        calories: item.calories,
      })
      .select("id")
      .single();
    if (error || !data) {
      hadFailure = true;
      console.error("Failed to migrate item to Supabase:", item.name, error);
      continue;
    }
    idMap.set(item.id, data.id);
  }

  const logsToInsert = localLogs
    .map((log) => {
      const remoteItemId = idMap.get(log.item_id);
      return remoteItemId ? { item_id: remoteItemId, consumed_at: log.consumed_at } : null;
    })
    .filter((log): log is { item_id: string; consumed_at: string } => log !== null);

  if (logsToInsert.length > 0) {
    const { error } = await supabase.from("logs").insert(logsToInsert);
    if (error) {
      hadFailure = true;
      console.error("Failed to migrate logs to Supabase:", error);
    }
  }

  if (!hadFailure) {
    clearLocalData();
  }
}
