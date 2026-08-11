import { createClient } from "@/lib/supabase/client";
import type { DataStore, ItemInput } from "@/lib/store/types";

const ITEM_COLUMNS = "id, name, protein, carbs, fat, calories, created_at";
const LOG_COLUMNS = "id, item_id, consumed_at";

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
  async logItem(itemId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("logs")
      .insert({ item_id: itemId })
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
};
