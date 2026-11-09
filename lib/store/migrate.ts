import { createClient } from "@/lib/supabase/client";
import {
  localStore,
  clearLocalData,
  clearLocalGoals,
  clearLocalLifts,
  clearLocalMovements,
  clearLocalNotes,
  clearLocalRawMacros,
} from "@/lib/store/local";
import { remoteStore } from "@/lib/store/remote";

/**
 * Same one-time upload as items/logs below, for additional raw macros: only
 * into an account with none yet, and local data is cleared only if it worked.
 */
async function migrateLocalRawMacrosToRemote(): Promise<void> {
  const localEntries = await localStore.listRawMacros();
  if (localEntries.length === 0) return;

  try {
    if ((await remoteStore.listRawMacros()).length > 0) return;
    const { error } = await createClient()
      .from("raw_macros")
      .insert(
        localEntries.map(({ protein, carbs, fat, calories, consumed_at }) => ({
          protein,
          carbs,
          fat,
          calories,
          consumed_at,
        }))
      );
    if (error) throw error;
    clearLocalRawMacros();
  } catch (err) {
    console.error("Failed to migrate raw macros to Supabase:", err);
  }
}

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
 * Same one-time upload as movements above, for lifts and their sets: only
 * into an account with no lifts yet, and local data is cleared only if every
 * lift and set made it.
 */
async function migrateLocalLiftsToRemote(): Promise<void> {
  const localLifts = await localStore.listLifts();
  if (localLifts.length === 0) return;

  try {
    if ((await remoteStore.listLifts()).length > 0) return;
    const localSets = await localStore.listLiftSets();

    const idMap = new Map<string, string>();
    for (const { id, name, goal } of localLifts) {
      const created = await remoteStore.createLift({ name, goal });
      idMap.set(id, created.id);
    }

    const setsToInsert = localSets.flatMap(({ lift_id, weight, reps, logged_at }) => {
      const liftId = idMap.get(lift_id);
      return liftId ? [{ lift_id: liftId, weight, reps, logged_at }] : [];
    });
    if (setsToInsert.length > 0) {
      const { error } = await createClient().from("lift_sets").insert(setsToInsert);
      if (error) throw error;
    }
    clearLocalLifts();
  } catch (err) {
    console.error("Failed to migrate lifts to Supabase:", err);
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
  await migrateLocalRawMacrosToRemote();
  await migrateLocalLiftsToRemote();

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
        staple: item.staple,
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
