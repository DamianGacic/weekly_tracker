"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Goals, Item, LogEntry, RawMacroEntry } from "@/lib/store/types";
import { useAuth, storeFor } from "@/lib/store/AuthProvider";
import { getWeekStart, formatWeekRange, weeksBetween } from "@/lib/week";
import { addMacros, portionsByItem, sumMacros, type MacroTotals } from "@/lib/macros";
import { NO_GOALS, goalForWeek } from "@/lib/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadWarning } from "@/components/LoadWarning";
import { cn } from "@/lib/utils";

/** One completed week on the chart. `totals` is null for a week with nothing tracked. */
type WeekPoint = {
  weekStart: Date;
  totals: MacroTotals | null;
  calorieLimit: number | null;
  proteinGoal: number | null;
};

type SeriesKey = "calories" | "calorieLimit" | "protein" | "proteinGoal" | "carbs" | "fat";

type SeriesDef = {
  key: SeriesKey;
  label: string;
  chart: "kcal" | "grams";
  color: string;
  dashed: boolean;
  value: (week: WeekPoint) => number | null;
};

const SERIES: SeriesDef[] = [
  {
    key: "calories",
    label: "Calories",
    chart: "kcal",
    color: "var(--foreground)",
    dashed: false,
    value: (w) => w.totals?.calories ?? null,
  },
  {
    key: "calorieLimit",
    label: "Calorie limit",
    chart: "kcal",
    color: "var(--muted-foreground)",
    dashed: true,
    value: (w) => w.calorieLimit,
  },
  {
    key: "protein",
    label: "Protein",
    chart: "grams",
    color: "var(--macro-protein)",
    dashed: false,
    value: (w) => w.totals?.protein ?? null,
  },
  {
    key: "proteinGoal",
    label: "Protein goal",
    chart: "grams",
    color: "var(--macro-protein)",
    dashed: true,
    value: (w) => w.proteinGoal,
  },
  {
    key: "carbs",
    label: "Carbs",
    chart: "grams",
    color: "var(--macro-carbs)",
    dashed: false,
    value: (w) => w.totals?.carbs ?? null,
  },
  {
    key: "fat",
    label: "Fat",
    chart: "grams",
    color: "var(--macro-fat)",
    dashed: false,
    value: (w) => w.totals?.fat ?? null,
  },
];

const DEFAULT_SHOWN: SeriesKey[] = ["calories", "calorieLimit", "protein", "proteinGoal"];

type Scale = "week" | "day";

type Span = { from: number; to: number };

export function ProgressionClient() {
  const { status, syncVersion } = useAuth();
  const store = useMemo(() => storeFor(status), [status]);

  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawMacros, setRawMacros] = useState<RawMacroEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(NO_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const [shown, setShown] = useState<Set<SeriesKey>>(() => new Set(DEFAULT_SHOWN));
  const [scale, setScale] = useState<Scale>("week");
  // null = every week. `pending` is the first end of a span being picked on the chart.
  const [span, setSpan] = useState<Span | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    const failed: string[] = [];
    function optional<T>(load: Promise<T>, label: string, fallback: T): Promise<T> {
      return load.catch((err) => {
        console.error(`Could not load ${label}:`, err);
        failed.push(label);
        return fallback;
      });
    }
    Promise.all([
      store.listItems(),
      store.listLogs(),
      optional(store.getGoals(), "goals", NO_GOALS),
      optional(store.listRawMacros(), "additional raw macros", [] as RawMacroEntry[]),
    ])
      .then(([loadedItems, loadedLogs, loadedGoals, loadedRawMacros]) => {
        if (!active) return;
        setItems(loadedItems);
        setLogs(loadedLogs);
        setGoals(loadedGoals);
        setRawMacros(loadedRawMacros);
        setMissing(failed);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Could not load items or logs:", err);
        if (!active) return;
        setError("Couldn't load your items and logs. Check your connection and reload the page.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store, status, syncVersion]);

  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);

  // Every completed week from the first tracked one up to last week, untracked weeks included.
  const weeks = useMemo<WeekPoint[]>(() => {
    const logsByWeek = new Map<number, LogEntry[]>();
    const rawByWeek = new Map<number, RawMacroEntry[]>();
    function bucket<T>(map: Map<number, T[]>, consumedAt: string, entry: T) {
      const date = new Date(consumedAt);
      if (date >= currentWeekStart) return;
      const key = getWeekStart(date).getTime();
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    for (const log of logs) bucket(logsByWeek, log.consumed_at, log);
    for (const entry of rawMacros) bucket(rawByWeek, entry.consumed_at, entry);

    const tracked = [...logsByWeek.keys(), ...rawByWeek.keys()];
    if (tracked.length === 0) return [];
    const first = new Date(Math.min(...tracked));
    const count = weeksBetween(first, currentWeekStart) + 1;

    return Array.from({ length: count }, (_, i) => {
      const weekStart = new Date(first);
      weekStart.setDate(weekStart.getDate() + 7 * i);
      const key = weekStart.getTime();
      const weekLogs = logsByWeek.get(key);
      const weekRaw = rawByWeek.get(key);
      const totals =
        weekLogs || weekRaw
          ? addMacros(sumMacros(items, portionsByItem(weekLogs ?? [])), weekRaw ?? [])
          : null;
      return {
        weekStart,
        totals,
        calorieLimit: goals.calories ? goalForWeek(goals.calories, weekStart) : null,
        proteinGoal: goals.protein ? goalForWeek(goals.protein, weekStart) : null,
      };
    });
  }, [logs, rawMacros, items, goals, currentWeekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const activeSpan: Span = span ?? { from: 0, to: Math.max(weeks.length - 1, 0) };

  function toggle(key: SeriesKey) {
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function pick(i: number) {
    if (pending === null) {
      setPending(i);
      setSpan({ from: i, to: i });
    } else {
      setSpan({ from: Math.min(pending, i), to: Math.max(pending, i) });
      setPending(null);
    }
  }

  function lastWeeks(n: number) {
    setPending(null);
    setSpan(n >= weeks.length ? null : { from: weeks.length - n, to: weeks.length - 1 });
  }

  const divisor = scale === "day" ? 7 : 1;
  const visible = SERIES.filter((s) => shown.has(s.key));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Progression</h1>
      <LoadWarning missing={missing} />
      {weeks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed weeks yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {SERIES.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={shown.has(s.key)}
                onClick={() => toggle(s.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  shown.has(s.key)
                    ? "border-foreground/30 bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                <SeriesSwatch series={s} />
                {s.label}
              </button>
            ))}
            <div className="ml-auto flex rounded-lg border p-0.5 text-xs">
              {(["week", "day"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={scale === option}
                  onClick={() => setScale(option)}
                  className={cn(
                    "rounded-md px-2 py-0.5",
                    scale === option ? "bg-muted font-medium" : "text-muted-foreground"
                  )}
                >
                  {option === "week" ? "Per week" : "Per day"}
                </button>
              ))}
            </div>
          </div>

          {(["kcal", "grams"] as const).map((chart) => {
            const series = visible.filter((s) => s.chart === chart);
            if (series.length === 0) return null;
            return (
              <Card key={chart}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {chart === "kcal" ? "Calories" : "Grams"}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {chart === "kcal" ? "kcal" : "g"} {scale === "week" ? "per week" : "per day (avg)"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WeekChart
                    weeks={weeks}
                    series={series}
                    divisor={divisor}
                    unit={chart === "kcal" ? " kcal" : "g"}
                    span={activeSpan}
                    pending={pending}
                    hover={hover}
                    onHover={setHover}
                    onPick={pick}
                  />
                </CardContent>
              </Card>
            );
          })}
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground">Pick something above to chart.</p>
          )}

          <SpanSummary
            weeks={weeks}
            span={activeSpan}
            isAll={span === null}
            pending={pending !== null}
            shown={shown}
            onLastWeeks={lastWeeks}
          />
        </>
      )}
    </div>
  );
}

function SeriesSwatch({ series }: { series: SeriesDef }) {
  return (
    <svg width="14" height="6" aria-hidden className="shrink-0">
      <line
        x1="1"
        x2="13"
        y1="3"
        y2="3"
        stroke={series.color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={series.dashed ? "3 3" : undefined}
      />
    </svg>
  );
}

const PAD = { left: 44, right: 10, top: 10, bottom: 24 };
const HEIGHT = 190;
const MIN_COL = 30;

/** Smallest of 1, 2, 2.5, 5, 10 × a power of ten that's at least `v`. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function WeekChart({
  weeks,
  series,
  divisor,
  unit,
  span,
  pending,
  hover,
  onHover,
  onPick,
}: {
  weeks: WeekPoint[];
  series: SeriesDef[];
  divisor: number;
  unit: string;
  span: Span;
  pending: number | null;
  hover: number | null;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Start scrolled to the newest weeks when the chart is wider than the card.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [width, weeks.length]);

  const n = weeks.length;
  const colW = width > 0 ? Math.max(MIN_COL, (width - PAD.left - PAD.right) / n) : MIN_COL;
  const svgW = PAD.left + PAD.right + colW * n;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + colW * (i + 0.5);

  const values = series.map((s) =>
    weeks.map((w) => {
      const v = s.value(w);
      return v === null ? null : v / divisor;
    })
  );
  const max = Math.max(0, ...values.flat().filter((v): v is number => v !== null));
  const tickStep = niceCeil(max / 4);
  const yMax = tickStep * 4;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  // Label every k-th week so the dates don't collide (~48px each).
  const labelEvery = Math.max(1, Math.ceil(48 / colW));

  return (
    <div ref={wrapRef} className="w-full">
      <div ref={scrollRef} className="relative overflow-x-auto">
        {width > 0 && (
          <div className="relative" style={{ width: svgW }}>
            <svg
              width={svgW}
              height={HEIGHT}
              role="img"
              aria-label={`${series.map((s) => s.label).join(", ")} by week`}
              onMouseLeave={() => onHover(null)}
            >
              {/* Selected span. */}
              <rect
                x={PAD.left + colW * span.from}
                y={PAD.top}
                width={colW * (span.to - span.from + 1)}
                height={plotH}
                className={pending !== null ? "fill-primary/10" : "fill-muted"}
              />
              {/* Grid + y labels. */}
              {[0, 1, 2, 3, 4].map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={svgW - PAD.right}
                    y1={y(t * tickStep)}
                    y2={y(t * tickStep)}
                    className="stroke-border"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 6}
                    y={y(t * tickStep)}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px] tabular-nums"
                  >
                    {fmt(t * tickStep)}
                  </text>
                </g>
              ))}
              {/* X labels. */}
              {weeks.map((w, i) =>
                (n - 1 - i) % labelEvery === 0 ? (
                  <text
                    key={i}
                    x={x(i)}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {shortDate(w.weekStart)}
                  </text>
                ) : null
              )}
              {hover !== null && (
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  className="stroke-foreground/30"
                  strokeWidth="1"
                />
              )}
              {/* Lines, broken across untracked weeks. */}
              {series.map((s, si) => (
                <g key={s.key}>
                  {segments(values[si]).map((seg, k) => (
                    <polyline
                      key={k}
                      points={seg.map((i) => `${x(i)},${y(values[si][i]!)}`).join(" ")}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray={s.dashed ? "5 4" : undefined}
                    />
                  ))}
                  {!s.dashed &&
                    values[si].map((v, i) =>
                      v === null ? null : (
                        <circle
                          key={i}
                          cx={x(i)}
                          cy={y(v)}
                          r={hover === i ? 4.5 : 3}
                          fill={s.color}
                          className="stroke-card"
                          strokeWidth="2"
                        />
                      )
                    )}
                </g>
              ))}
              {/* Hit targets: one full-height column per week. */}
              {weeks.map((_, i) => (
                <rect
                  key={i}
                  x={PAD.left + colW * i}
                  y={0}
                  width={colW}
                  height={HEIGHT}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => onHover(i)}
                  onClick={() => onPick(i)}
                />
              ))}
            </svg>
            {hover !== null && (
              <div
                className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm"
                style={
                  x(hover) > svgW / 2
                    ? { right: svgW - x(hover) + 10 }
                    : { left: x(hover) + 10 }
                }
              >
                <p className="mb-1 font-medium">{formatWeekRange(weeks[hover].weekStart)}</p>
                {weeks[hover].totals === null && (
                  <p className="text-muted-foreground">Nothing tracked</p>
                )}
                {series.map((s, si) => {
                  const v = values[si][hover];
                  if (v === null) return null;
                  return (
                    <p key={s.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <SeriesSwatch series={s} />
                        {s.label}
                      </span>
                      <span className="tabular-nums">
                        {fmt(v)}
                        {unit}
                      </span>
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {pending !== null
          ? "Now click the week that ends the span."
          : "Click a week, then another, to pick a span to add up."}
      </p>
    </div>
  );
}

/** Runs of consecutive non-null indexes. */
function segments(values: (number | null)[]): number[][] {
  const runs: number[][] = [];
  let run: number[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(i);
  });
  if (run.length) runs.push(run);
  return runs;
}

function SpanSummary({
  weeks,
  span,
  isAll,
  pending,
  shown,
  onLastWeeks,
}: {
  weeks: WeekPoint[];
  span: Span;
  isAll: boolean;
  pending: boolean;
  shown: Set<SeriesKey>;
  onLastWeeks: (n: number) => void;
}) {
  const inSpan = weeks.slice(span.from, span.to + 1);
  // Untracked weeks have no real numbers, so their goals are left out too.
  const tracked = inSpan.filter((w) => w.totals !== null);
  const sum = (f: (w: WeekPoint) => number | null) =>
    tracked.reduce((total, w) => total + (f(w) ?? 0), 0);
  const real = {
    calories: sum((w) => w.totals!.calories),
    protein: sum((w) => w.totals!.protein),
    carbs: sum((w) => w.totals!.carbs),
    fat: sum((w) => w.totals!.fat),
  };
  const hasLimit = tracked.some((w) => w.calorieLimit !== null);
  const hasProteinGoal = tracked.some((w) => w.proteinGoal !== null);
  const calorieLimit = sum((w) => w.calorieLimit);
  const proteinGoal = sum((w) => w.proteinGoal);

  const first = inSpan[0].weekStart;
  const lastEnd = new Date(inSpan[inSpan.length - 1].weekStart);
  const untracked = inSpan.length - tracked.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {inSpan.length === 1
                ? formatWeekRange(first)
                : `${shortDate(first)} – ${formatWeekRange(lastEnd).split(" – ")[1]}`}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {inSpan.length} {inSpan.length === 1 ? "week" : "weeks"}
              {untracked > 0 && ` · ${untracked} untracked, left out`}
              {pending && " · picking…"}
            </p>
          </div>
          <div className="flex gap-1">
            {[4, 12].map((n) =>
              n < weeks.length ? (
                <Button key={n} variant="outline" size="xs" onClick={() => onLastWeeks(n)}>
                  Last {n}
                </Button>
              ) : null
            )}
            <Button
              variant={isAll ? "secondary" : "outline"}
              size="xs"
              onClick={() => onLastWeeks(weeks.length)}
            >
              All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tracked.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing tracked in this span.</p>
        ) : (
          <>
            {(shown.has("calories") || shown.has("calorieLimit")) && (
              <GoalSummaryRow
                label="Calories"
                unit=" kcal"
                kind="limit"
                real={shown.has("calories") ? real.calories : null}
                goal={shown.has("calorieLimit") ? (hasLimit ? calorieLimit : 0) : null}
                goalMissing={!hasLimit}
                weeks={tracked.length}
              />
            )}
            {(shown.has("protein") || shown.has("proteinGoal")) && (
              <GoalSummaryRow
                label="Protein"
                unit="g"
                kind="target"
                real={shown.has("protein") ? real.protein : null}
                goal={shown.has("proteinGoal") ? (hasProteinGoal ? proteinGoal : 0) : null}
                goalMissing={!hasProteinGoal}
                weeks={tracked.length}
              />
            )}
            {shown.has("carbs") && (
              <GoalSummaryRow label="Carbs" unit="g" kind="target" real={real.carbs} goal={null} weeks={tracked.length} />
            )}
            {shown.has("fat") && (
              <GoalSummaryRow label="Fat" unit="g" kind="target" real={real.fat} goal={null} weeks={tracked.length} />
            )}
            {shown.size === 0 && (
              <p className="text-sm text-muted-foreground">Pick something above to add up.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GoalSummaryRow({
  label,
  unit,
  kind,
  real,
  goal,
  goalMissing = false,
  weeks,
}: {
  label: string;
  unit: string;
  /** "limit": staying under is good (calories). "target": reaching it is good (protein). */
  kind: "limit" | "target";
  real: number | null;
  goal: number | null;
  goalMissing?: boolean;
  weeks: number;
}) {
  const diff = real !== null && goal !== null && !goalMissing ? real - goal : null;
  const good = diff === null ? null : kind === "limit" ? diff <= 0 : diff >= 0;
  const goalName = kind === "limit" ? "limit" : "goal";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {real !== null && (
          <Stat
            label="Eaten"
            value={`${fmt(real)}${unit}`}
            sub={`${fmt(real / weeks)}${unit}/week avg`}
          />
        )}
        {goal !== null && (
          <Stat
            label={kind === "limit" ? "Limit" : "Goal"}
            value={goalMissing ? "—" : `${fmt(goal)}${unit}`}
            sub={goalMissing ? `No ${goalName} set` : `${fmt(goal / weeks)}${unit}/week avg`}
          />
        )}
        {diff !== null && (
          <Stat
            label={diff >= 0 ? `Above ${goalName}` : `Below ${goalName}`}
            value={`${diff >= 0 ? "+" : "−"}${fmt(Math.abs(diff))}${unit}`}
            sub={goal! > 0 ? `${diff >= 0 ? "+" : "−"}${Math.abs(Math.round((diff / goal!) * 100))}%` : undefined}
            tone={good ? "good" : "bad"}
          />
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "good" && "text-green-600 dark:text-green-500",
          tone === "bad" && "text-red-600 dark:text-red-500"
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
