import type { Cell, Row, Sheet } from "write-excel-file/browser";
import type { DataStore, Item, LogEntry } from "@/lib/store/types";
import { macrosFor, portionsByItem, round1, sumMacros, type MacroTotals } from "@/lib/macros";
import { getISOWeek, getWeekStart } from "@/lib/week";

function localDateStamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  // Firefox only follows links that are in the page, and some browsers start
  // the download asynchronously, so the link and URL are cleaned up later.
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 100);
}

/** Downloads everything in `store` as JSON: the complete backup, every log with its timestamp. */
export async function downloadJsonExport(store: DataStore, account: string | null) {
  const [items, logs, goals] = await Promise.all([
    store.listItems(),
    store.listLogs(),
    store.getGoals(),
  ]);
  const now = new Date();
  const json = JSON.stringify({ exportedAt: now.toISOString(), account, items, logs, goals }, null, 2);
  saveFile(new Blob([json], { type: "application/json" }), `weekly-export-${localDateStamp(now)}.json`);
}

const HEADER = ["Week", "Week of", "Item", "Portions", "Protein g", "Carbs g", "Fat g", "kcal"];
const COLUMN_WIDTHS = [6, 11, 28, 8, 10, 9, 7, 8].map((width) => ({ width }));

function macroRow(
  week: number,
  weekOf: Date,
  label: string,
  portions: number,
  macros: MacroTotals,
  bold: boolean
): Row {
  const fontWeight = bold ? ("bold" as const) : undefined;
  const cell = (value: string | number): Cell => ({ value, fontWeight });
  return [
    cell(week),
    { value: weekOf, format: "yyyy-mm-dd", fontWeight },
    cell(label),
    cell(Math.round(portions * 100) / 100),
    cell(round1(macros.protein)),
    cell(round1(macros.carbs)),
    cell(round1(macros.fat)),
    cell(round1(macros.calories)),
  ];
}

function weekRows(weekStart: Date, weekLogs: LogEntry[], items: Item[]): Row[] {
  const { week } = getISOWeek(weekStart);
  // Excel dates have no time zone and write-excel-file converts them as UTC,
  // so the local calendar date goes in as UTC midnight.
  const weekOf = new Date(
    Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
  );
  const portions = portionsByItem(weekLogs);
  // Same order as the app's week list: most calories first.
  const weekItems = items
    .filter((item) => portions.has(item.id))
    .map((item) => ({ item, macros: macrosFor(item, portions.get(item.id)!) }))
    .sort((a, b) => b.macros.calories - a.macros.calories);

  const rows = weekItems.map(({ item, macros }) =>
    macroRow(week, weekOf, item.name, portions.get(item.id)!, macros, false)
  );
  const totalPortions = weekItems.reduce((sum, { item }) => sum + portions.get(item.id)!, 0);
  rows.push(macroRow(week, weekOf, "Total", totalPortions, sumMacros(items, portions), true));
  return rows;
}

/**
 * Downloads an Excel workbook with one sheet per (ISO week-)year: a row per
 * item per week, then a bold total row. Like the app, it never breaks a week
 * down by day.
 */
export async function downloadExcelExport(store: DataStore) {
  const [{ default: writeExcelFile }, [items, logs]] = await Promise.all([
    import("write-excel-file/browser"),
    Promise.all([store.listItems(), store.listLogs()]),
  ]);

  const logsByWeek = new Map<number, LogEntry[]>();
  for (const log of logs) {
    const key = getWeekStart(new Date(log.consumed_at)).getTime();
    const group = logsByWeek.get(key) ?? [];
    group.push(log);
    logsByWeek.set(key, group);
  }

  const rowsByYear = new Map<number, Row[]>();
  for (const key of [...logsByWeek.keys()].sort((a, b) => a - b)) {
    const weekStart = new Date(key);
    const { year } = getISOWeek(weekStart);
    const rows = rowsByYear.get(year) ?? [];
    rows.push(...weekRows(weekStart, logsByWeek.get(key)!, items));
    rowsByYear.set(year, rows);
  }
  if (rowsByYear.size === 0) rowsByYear.set(getISOWeek(new Date()).year, []);

  const header: Row = HEADER.map((value) => ({ value, fontWeight: "bold" }));
  const sheets: Sheet<Blob>[] = [...rowsByYear].map(([year, rows]) => ({
    sheet: String(year),
    data: [header, ...rows],
    columns: COLUMN_WIDTHS,
    stickyRowsCount: 1,
  }));

  const now = new Date();
  saveFile(await writeExcelFile(sheets).toBlob(), `weekly-export-${localDateStamp(now)}.xlsx`);
}
