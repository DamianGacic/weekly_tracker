import { calorieShares, round1, type MacroTotals } from "@/lib/macros";

const MACROS = [
  { key: "protein", letter: "P", name: "Protein", fill: "fill-macro-protein", dot: "bg-macro-protein" },
  { key: "carbs", letter: "C", name: "Carbs", fill: "fill-macro-carbs", dot: "bg-macro-carbs" },
  { key: "fat", letter: "F", name: "Fat", fill: "fill-macro-fat", dot: "bg-macro-fat" },
] as const;

type Shares = NonNullable<ReturnType<typeof calorieShares>>;
type MacroGrams = Pick<MacroTotals, "protein" | "carbs" | "fat">;

// Geometry is drawn in an 18-unit box and scaled to the requested size.
const VIEW = 18;
const R = VIEW / 2;

/** Point on the pie's edge `fraction` of the way round, clockwise from 12 o'clock. */
function edgePoint(fraction: number): [number, number] {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return [R + R * Math.cos(angle), R + R * Math.sin(angle)];
}

/** Whole-number percentages that still add up to 100 (largest remainder gets the rounding). */
function percents(shares: Shares): Shares {
  const exact = MACROS.map((macro) => shares[macro.key] * 100);
  const floored = exact.map(Math.floor);
  const missing = 100 - floored.reduce((sum, n) => sum + n, 0);
  const byRemainder = [0, 1, 2].sort((a, b) => (exact[b] % 1) - (exact[a] % 1));
  for (const i of byRemainder.slice(0, missing)) floored[i] += 1;
  return { protein: floored[0], carbs: floored[1], fat: floored[2] };
}

function splitLabel(shares: Shares) {
  const pct = percents(shares);
  return "Calories: " + MACROS.map((macro) => `${pct[macro.key]}% ${macro.name.toLowerCase()}`).join(" · ");
}

/**
 * Pie of where calories come from (protein, carbs, fat, clockwise from the
 * top). Per item, the ratio is the same however much was eaten.
 */
export function MacroPie({ macros, size = 18 }: { macros: MacroGrams; size?: number }) {
  const shares = calorieShares(macros.protein, macros.carbs, macros.fat);
  if (!shares) {
    return (
      <span
        role="img"
        aria-label="No macros entered"
        title="No macros entered"
        className="shrink-0 rounded-full bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }

  const label = splitLabel(shares);
  const present = MACROS.filter((macro) => shares[macro.key] > 0);
  const slices = present.map((macro, i) => ({
    ...macro,
    share: shares[macro.key],
    from: present.slice(0, i).reduce((sum, prev) => sum + shares[prev.key], 0),
  }));
  // Gaps of ~1.25px on tiny pies and 2px on larger ones, in viewBox units.
  const gap = ((size <= 24 ? 1.25 : 2) * VIEW) / size;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="shrink-0"
      style={{ width: size, height: size }}
    >
      <title>{label}</title>
      {slices.length === 1 ? (
        <circle cx={R} cy={R} r={R} className={slices[0].fill} />
      ) : (
        <>
          {slices.map(({ key, fill, share, from }) => {
            const [x0, y0] = edgePoint(from);
            const [x1, y1] = edgePoint(from + share);
            return (
              <path
                key={key}
                d={`M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${share > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z`}
                className={fill}
              />
            );
          })}
          {/* Thin gaps in the card's color between slices, so neighbors don't blur together. */}
          {slices.map(({ key, from }) => {
            const [x, y] = edgePoint(from);
            return (
              <line
                key={key}
                x1={R}
                y1={R}
                x2={x}
                y2={y}
                strokeWidth={gap}
                strokeLinecap="round"
                className="stroke-card"
              />
            );
          })}
        </>
      )}
    </svg>
  );
}

/** A week's overall calorie split: a larger pie with each macro's share labeled beside it. */
export function MacroSplitSummary({ macros }: { macros: MacroGrams }) {
  const shares = calorieShares(macros.protein, macros.carbs, macros.fat);
  const pct = shares && percents(shares);
  return (
    <div className="flex items-center gap-4">
      <MacroPie macros={macros} size={56} />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Calorie split</span>
        {pct ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {MACROS.map((macro) => (
              <li key={macro.key} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`size-2 rounded-full ${macro.dot}`} />
                {macro.name}
                <span className="font-semibold tabular-nums">{pct[macro.key]}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-muted-foreground">Nothing logged yet</span>
        )}
      </div>
    </div>
  );
}

/**
 * "378 kcal  ● P66  ● C24  ● F1": each macro is led by a dot in its pie
 * color, which doubles as the legend and separates the values without
 * leaving a dangling "·" when the line wraps.
 */
export function MacroLine({ macros }: { macros: MacroTotals }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      <span>{round1(macros.calories)} kcal</span>
      {MACROS.map((macro) => (
        <span key={macro.key} className="inline-flex items-center gap-1">
          <span aria-hidden className={`size-1.5 rounded-full ${macro.dot}`} />
          {macro.letter}
          {round1(macros[macro.key])}
        </span>
      ))}
    </span>
  );
}
