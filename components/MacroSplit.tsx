import { calorieShares, round1, type MacroTotals } from "@/lib/macros";

const MACROS = [
  { key: "protein", letter: "P", label: "protein", fill: "fill-macro-protein", dot: "bg-macro-protein" },
  { key: "carbs", letter: "C", label: "carbs", fill: "fill-macro-carbs", dot: "bg-macro-carbs" },
  { key: "fat", letter: "F", label: "fat", fill: "fill-macro-fat", dot: "bg-macro-fat" },
] as const;

const SIZE = 18;
const R = SIZE / 2;

/** Point on the pie's edge `fraction` of the way round, clockwise from 12 o'clock. */
function edgePoint(fraction: number): [number, number] {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return [R + R * Math.cos(angle), R + R * Math.sin(angle)];
}

/**
 * Tiny pie of where an item's calories come from (protein, carbs, fat,
 * clockwise from the top). The ratio is the same however much was eaten.
 */
export function MacroPie({ macros }: { macros: Pick<MacroTotals, "protein" | "carbs" | "fat"> }) {
  const shares = calorieShares(macros.protein, macros.carbs, macros.fat);
  if (!shares) {
    return (
      <span
        role="img"
        aria-label="No macros entered"
        title="No macros entered"
        className="size-[18px] shrink-0 rounded-full bg-muted"
      />
    );
  }

  const label =
    "Calories: " +
    MACROS.map((macro) => `${Math.round(shares[macro.key] * 100)}% ${macro.label}`).join(" · ");
  const present = MACROS.filter((macro) => shares[macro.key] > 0);
  const slices = present.map((macro, i) => ({
    ...macro,
    share: shares[macro.key],
    from: present.slice(0, i).reduce((sum, prev) => sum + shares[prev.key], 0),
  }));

  if (slices.length === 1) {
    return (
      <svg role="img" aria-label={label} viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-[18px] shrink-0">
        <title>{label}</title>
        <circle cx={R} cy={R} r={R} className={slices[0].fill} />
      </svg>
    );
  }

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-[18px] shrink-0">
      <title>{label}</title>
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
            strokeWidth={1.25}
            strokeLinecap="round"
            className="stroke-card"
          />
        );
      })}
    </svg>
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
