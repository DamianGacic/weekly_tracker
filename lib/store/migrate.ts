import { createClient } from "@/lib/supabase/client";
import {
  localStore,
  clearLocalData,
  clearLocalGoals,
  clearLocalMovements,
  clearLocalNotes,
} from "@/lib/store/local";
import { remoteStore } from "@/lib/store/remote";

/**
 * Same one-time upload as items/logs below, for movements and their logs:
 * only into an account with no movements yet, and local data is cleared only
 * if every movement made it.
 */
async function migrateLocalMovementsToRemote(): Promise<void> {
  const localMovements = await localStore.listMovements();
  if (localMovements.length === 0) return;

  try {
    if ((await remoteStore.listMovements()).length > 0) return;
    const localLogs = await localStore.listMovementLogs();

    const idMap = new Map<string, string>();
    for (const { id, name, kind, default_amount, goal } of localMovements) {
      const created = await remoteStore.createMovement({ name, kind, default_amount, goal });
      idMap.set(id, created.id);
    }

    const logsToInsert = localLogs.flatMap((log) => {
      const movementId = idMap.get(log.movement_id);
      return movementId ? [{ movement_id: movementId, amount: log.amount, logged_at: log.logged_at }] : [];
    });
    if (logsToInsert.length > 0) {
      const { error } = await createClient().from("movement_logs").insert(logsToInsert);
      if (error) throw error;
    }
    clearLocalMovements();
  } catch (err) {
    console.error("Failed to migrate movements to Supabase:", err);
  }
}

/**
 * Week notes written while signed out are uploaded for weeks the account has
 * no note for yet; a week that already has one keeps it.
 */
async function migrateLocalNotesToRemote(): Promise<void> {
  const localNotes = await localStore.listWeekNotes();
  if (Object.keys(localNotes).length === 0) return;

  try {
    const remoteNotes = await remoteStore.listWeekNotes();
    for (const [weekKey, note] of Object.entries(localNotes)) {
      if (!(weekKey in remoteNotes)) await remoteStore.saveWeekNote(weekKey, note);
    }
    clearLocalNotes();
  } catch (err) {
    console.error("Failed to migrate week notes to Supabase:", err);
  }
}

/**
 * Goals set while signed out are uploaded only if the account has no goals
 * of its own yet — same "don't clobber an existing account" rule as items.
 */
async function migrateLocalGoalsToRemote(): Promise<void> {
  const localGoals = await localStore.getGoals();
  if (!localGoals.protein && !localGoals.calories) return;

  try {
    const remoteGoals = await remoteStore.getGoals();
    if (remoteGoals.protein || remoteGoals.calories) return;
    await remoteStore.saveGoals(localGoals);
    clearLocalGoals();
  } catch (err) {
    console.error("Failed to migrate goals to Supabase:", err);
  }
}

/**
 * One-time upload of locally-tracked items/logs into a freshly signed-in
 * account. Only runs if the account has no items yet, so it's safe to call
 * on every sign-in without duplicating data on a second device or a re-login.
 * Local data is only cleared once every item migrated successfully, so a
 * partial failure (e.g. a name collision) leaves the source data intact
 * instead of silently dropping it.
 */
export async function migrateLocalDataToRemote(): Promise<void> {
  await migrateLocalGoalsToRemote();
  await migrateLocalNotesToRemote();
  await migrateLocalMovementsToRemote();

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
      return remoteItemId
        ? { item_id: remoteItemId, consumed_at: log.consumed_at, amount: log.amount }
        : null;
    })
    .filter(
      (log): log is { item_id: string; consumed_at: string; amount: number } => log !== null
    );

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
