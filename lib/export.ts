import type { Cell, Row, Sheet } from "write-excel-file/browser";
import type { DataStore, Item, LogEntry, RawMacroEntry } from "@/lib/store/types";
import {
  addMacros,
  macrosFor,
  portionsByItem,
  round1,
  sumMacros,
  ZERO_MACROS,
  type MacroTotals,
} from "@/lib/macros";
import { getISOWeek, getWeekStart, localDateKey } from "@/lib/week";

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
  const [items, logs, rawMacros, goals, notes, movements, movementLogs, habits, habitChecks] =
    await Promise.all([
      store.listItems(),
      store.listLogs(),
      store.listRawMacros(),
      store.getGoals(),
      store.listWeekNotes(),
      store.listMovements(),
      store.listMovementLogs(),
      store.listHabits(),
      store.listHabitChecks(),
    ]);
  const now = new Date();
  const json = JSON.stringify(
    {
      exportedAt: now.toISOString(),
      account,
      items,
      logs,
      rawMacros,
      goals,
      notes,
      movements,
      movementLogs,
      habits,
      habitChecks,
    },
    null,
    2
  );
  saveFile(new Blob([json], { type: "application/json" }), `weekly-export-${localDateKey(now)}.json`);
}

const HEADER = ["Week", "Week of", "Item", "Portions", "Protein g", "Carbs g", "Fat g", "kcal", "Note"];
const COLUMN_WIDTHS = [6, 11, 28, 8, 10, 9, 7, 8, 40].map((width) => ({ width }));

function macroRow(
  week: number,
  weekOf: Date,
  label: string,
  /** Null for a row that isn't made of portions: the additional raw macros. */
  portions: number | null,
  macros: MacroTotals,
  bold: boolean
): Row {
  const fontWeight = bold ? ("bold" as const) : undefined;
  const cell = (value: string | number): Cell => ({ value, fontWeight });
  return [
    cell(week),
    { value: weekOf, format: "yyyy-mm-dd", fontWeight },
    cell(label),
    portions === null ? null : cell(Math.round(portions * 100) / 100),
    cell(round1(macros.protein)),
    cell(round1(macros.carbs)),
    cell(round1(macros.fat)),
    cell(round1(macros.calories)),
  ];
}

/** The week's additional raw macros, its item rows, then its bold total row carrying the week's note. */
function weekRows(
  weekStart: Date,
  weekLogs: LogEntry[],
  weekRawMacros: RawMacroEntry[],
  items: Item[],
  note: string
): Row[] {
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

  const rows: Row[] = [];
  if (weekRawMacros.length > 0) {
    const rawTotals = addMacros(ZERO_MACROS, weekRawMacros);
    rows.push(macroRow(week, weekOf, "Additional raw macros", null, rawTotals, false));
  }
  for (const { item, macros } of weekItems) {
    rows.push(macroRow(week, weekOf, item.name, portions.get(item.id)!, macros, false));
  }
  const totalPortions = weekItems.reduce((sum, { item }) => sum + portions.get(item.id)!, 0);
  const totals = addMacros(sumMacros(items, portions), weekRawMacros);
  rows.push([...macroRow(week, weekOf, "Total", totalPortions, totals, true), note]);
  return rows;
}

function groupByWeek<T extends { consumed_at: string }>(entries: T[]): Map<number, T[]> {
  const byWeek = new Map<number, T[]>();
  for (const entry of entries) {
    const key = getWeekStart(new Date(entry.consumed_at)).getTime();
    const group = byWeek.get(key) ?? [];
    group.push(entry);
    byWeek.set(key, group);
  }
  return byWeek;
}

/**
 * Downloads an Excel workbook with one sheet per (ISO week-)year: a row per
 * item per week, then a bold total row. Like the app, it never breaks a week
 * down by day.
 */
export async function downloadExcelExport(store: DataStore) {
  const [{ default: writeExcelFile }, [items, logs, rawMacros, notes]] = await Promise.all([
    import("write-excel-file/browser"),
    Promise.all([
      store.listItems(),
      store.listLogs(),
      store.listRawMacros(),
      store.listWeekNotes(),
    ]),
  ]);

  const logsByWeek = groupByWeek(logs);
  const rawMacrosByWeek = groupByWeek(rawMacros);
  const weekKeys = new Set([...logsByWeek.keys(), ...rawMacrosByWeek.keys()]);

  const rowsByYear = new Map<number, Row[]>();
  for (const key of [...weekKeys].sort((a, b) => a - b)) {
    const weekStart = new Date(key);
    const { year } = getISOWeek(weekStart);
    const rows = rowsByYear.get(year) ?? [];
    rows.push(
      ...weekRows(
        weekStart,
        logsByWeek.get(key) ?? [],
        rawMacrosByWeek.get(key) ?? [],
        items,
        notes[localDateKey(weekStart)] ?? ""
      )
    );
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
  saveFile(await writeExcelFile(sheets).toBlob(), `weekly-export-${localDateKey(now)}.xlsx`);
}
