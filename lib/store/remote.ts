import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type {
  DataStore,
  Goal,
  Goals,
  ItemInput,
  Movement,
  MovementInput,
} from "@/lib/store/types";
import { NO_GOALS } from "@/lib/goals";

const ITEM_COLUMNS = "id, name, protein, carbs, fat, calories, created_at";
const LOG_COLUMNS = "id, item_id, consumed_at, amount";
const GOAL_COLUMNS =
  "protein_value, protein_anchor_week, protein_step, protein_step_mode, calories_value, calories_anchor_week, calories_step, calories_step_mode";
const MOVEMENT_COLUMNS =
  "id, name, kind, default_amount, goal_value, goal_anchor_week, goal_step, goal_step_mode, created_at";
const MOVEMENT_LOG_COLUMNS = "id, movement_id, amount, logged_at";

type GoalsRow = Database["public"]["Tables"]["goals"]["Row"];
type MovementRow = Database["public"]["Tables"]["movements"]["Row"];

function toGoal(
  value: number | null,
  anchorWeek: string | null,
  step: number,
  stepMode: Goal["stepMode"]
): Goal | null {
  return value === null || anchorWeek === null ? null : { value, anchorWeek, step, stepMode };
}

function movementFromRow(row: Omit<MovementRow, "user_id">): Movement {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    default_amount: row.default_amount,
    goal: toGoal(row.goal_value, row.goal_anchor_week, row.goal_step, row.goal_step_mode),
    created_at: row.created_at,
  };
}

function movementColumns(input: MovementInput) {
  return {
    name: input.name,
    kind: input.kind,
    default_amount: input.default_amount,
    goal_value: input.goal?.value ?? null,
    goal_anchor_week: input.goal?.anchorWeek ?? null,
    goal_step: input.goal?.step ?? 0,
    goal_step_mode: input.goal?.stepMode ?? "flat",
  };
}

function goalsFromRow(row: Omit<GoalsRow, "user_id" | "updated_at">): Goals {
  return {
    protein: toGoal(row.protein_value, row.protein_anchor_week, row.protein_step, row.protein_step_mode),
    calories: toGoal(
      row.calories_value,
      row.calories_anchor_week,
      row.calories_step,
      row.calories_step_mode
    ),
  };
}

export const remoteStore: DataStore = {
  async listItems() {
    const supabase = createClient();
    const { data, error } = await supabase.from("items").select(ITEM_COLUMNS).order("name");
    if (error) throw error;
    return data ?? [];
  },
  async listLogs() {
    const supabase = createClient();
    const { data, error } = await supabase.from("logs").select(LOG_COLUMNS);
    if (error) throw error;
    return data ?? [];
  },
  async createItem(input: ItemInput) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("items")
      .insert(input)
      .select(ITEM_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Could not create item.");
    return data;
  },
  async updateItem(itemId: string, input: ItemInput) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("items")
      .update(input)
      .eq("id", itemId)
      .select(ITEM_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Could not update item.");
    return data;
  },
  async logItem(itemId: string, consumedAt?: string, amount = 1) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("logs")
      .insert(
        consumedAt
          ? { item_id: itemId, consumed_at: consumedAt, amount }
          : { item_id: itemId, amount }
      )
      .select(LOG_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Could not log item.");
    return data;
  },
  async deleteLog(logId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("logs").delete().eq("id", logId);
    if (error) throw error;
  },
  async getGoals() {
    const supabase = createClient();
    const { data, error } = await supabase.from("goals").select(GOAL_COLUMNS).maybeSingle();
    if (error) throw error;
    return data ? goalsFromRow(data) : NO_GOALS;
  },
  async saveGoals(goals: Goals) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in.");
    const { data, error } = await supabase
      .from("goals")
      .upsert({
        user_id: session.user.id,
        protein_value: goals.protein?.value ?? null,
        protein_anchor_week: goals.protein?.anchorWeek ?? null,
        protein_step: goals.protein?.step ?? 0,
        protein_step_mode: goals.protein?.stepMode ?? "flat",
        calories_value: goals.calories?.value ?? null,
        calories_anchor_week: goals.calories?.anchorWeek ?? null,
        calories_step: goals.calories?.step ?? 0,
        calories_step_mode: goals.calories?.stepMode ?? "flat",
        updated_at: new Date().toISOString(),
      })
      .select(GOAL_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Could not save goals.");
    return goalsFromRow(data);
  },
  async listWeekNotes() {
    const supabase = createClient();
    const { data, error } = await supabase.from("week_notes").select("week_start, note");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((row) => [row.week_start, row.note]));
  },
  async saveWeekNote(weekKey: string, note: string) {
    const supabase = createClient();
    if (note.trim() === "") {
      const { error } = await supabase.from("week_notes").delete().eq("week_start", weekKey);
      if (error) throw error;
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in.");
    const { error } = await supabase.from("week_notes").upsert({
      user_id: session.user.id,
      week_start: weekKey,
      note,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },
  async listMovements() {
    const supabase = createClient();
    const { data, error } = await supabase.from("movements").select(MOVEMENT_COLUMNS).order("name");
    if (error) throw error;
    return (data ?? []).map(movementFromRow);
  },
  async createMovement(input: MovementInput) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("movements")
      .insert(movementColumns(input))
      .select(MOVEMENT_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Could not create move.");
    return movementFromRow(data);
  },
  async updateMovement(movementId: string, input: MovementInput) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("movements")
      .update(movementColumns(input))
      .eq("id", movementId)
      .select(MOVEMENT_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Could not update move.");
    return movementFromRow(data);
  },
  async listMovementLogs() {
    const supabase = createClient();
    const { data, error } = await supabase.from("movement_logs").select(MOVEMENT_LOG_COLUMNS);
    if (error) throw error;
    return data ?? [];
  },
  async logMovement(movementId: string, amount: number, loggedAt?: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("movement_logs")
      .insert(
        loggedAt
          ? { movement_id: movementId, amount, logged_at: loggedAt }
          : { movement_id: movementId, amount }
      )
      .select(MOVEMENT_LOG_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Could not log move.");
    return data;
  },
  async deleteMovementLog(logId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("movement_logs").delete().eq("id", logId);
    if (error) throw error;
  },
};
