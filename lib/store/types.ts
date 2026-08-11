export type Item = {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  created_at: string;
};

export type LogEntry = {
  id: string;
  item_id: string;
  consumed_at: string;
};

export type ItemInput = {
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
};

export interface DataStore {
  listItems(): Promise<Item[]>;
  listLogs(): Promise<LogEntry[]>;
  createItem(input: ItemInput): Promise<Item>;
  updateItem(itemId: string, input: ItemInput): Promise<Item>;
  /** `consumedAt` defaults to now; pass it explicitly to log into a past week. */
  logItem(itemId: string, consumedAt?: string): Promise<LogEntry>;
  deleteLog(logId: string): Promise<void>;
}
