import type { GoalStatus } from "@/lib/goals";
import { round1 } from "@/lib/macros";
import { cn } from "@/lib/utils";

// Every 12h across the week, Mon 00:00 through the following Mon 00:00.
const WEEK_MARKERS = [
  "Mon", "12pm", "Tue", "12pm", "Wed", "12pm", "Thu",
  "12pm", "Fri", "12pm", "Sat", "12pm", "Sun", "12pm", "Mon",
];

export function WeekProgressBar({ fraction }: { fraction: number }) {
  const percent = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  return (
    <div className="mt-1.5">
      <div
        role="progressbar"
        aria-label="Portion of the week elapsed"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        title={`${percent}% of the week elapsed`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1 flex justify-between">
        {WEEK_MARKERS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="h-1 w-px bg-border" />
            <span className="text-[9px] leading-none whitespace-nowrap text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<GoalStatus, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

/**
 * Same size and scale as the week bar: full = the whole weekly goal, so its
 * fill lines up against how much of the week has passed. The tick marks the
 * pro-rata share for right now.
 */
export function GoalBar({
  label,
  hint,
  emptyLabel,
  consumed,
  target,
  unit,
  progress,
  status,
}: {
  label: string;
  /** Shown in lighter text after the label, e.g. what tapping the bar logs. */
  hint?: string;
  emptyLabel: string;
  consumed: number;
  target: number | null;
  unit: string;
  progress: number;
  status: GoalStatus | null;
}) {
  const fraction = target === null ? 0 : target > 0 ? Math.min(consumed / target, 1) : consumed > 0 ? 1 : 0;
  const percent = Math.round(fraction * 100);
  const pacePercent = Math.min(Math.max(progress, 0), 1) * 100;
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {label}
          {hint && <span className="ml-1.5 text-muted-foreground/70">{hint}</span>}
        </span>
        {target === null ? (
          <span className="text-muted-foreground">{emptyLabel}</span>
        ) : (
          <span>
            {round1(consumed)} / {round1(target)}
            {unit}
          </span>
        )}
      </div>
      <div className="relative">
        <div
          role="progressbar"
          aria-label={`${label} so far this week`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          title={
            target === null
              ? undefined
              : `${round1(target * progress)}${unit} would be right on pace by now`
          }
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          {status && (
            <div
              className={cn("h-full rounded-full", STATUS_COLORS[status])}
              style={{ width: `${fraction * 100}%` }}
            />
          )}
        </div>
        {target !== null && (
          <span
            aria-hidden
            className="absolute -top-0.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60"
            style={{ left: `${pacePercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
