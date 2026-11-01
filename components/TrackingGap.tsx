/**
 * Thin divider in History marking a stretch of weeks with nothing tracked,
 * between the week starting `after` and the next week that has logs.
 */
export function TrackingGap({ after, weeks }: { after: Date; weeks: number }) {
  const from = new Date(after);
  from.setDate(from.getDate() + 7);
  const to = new Date(after);
  to.setDate(to.getDate() + 7 * (weeks + 1) - 1);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div role="note" className="flex items-center gap-3 text-xs text-muted-foreground">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="shrink-0">
        No tracking {fmt(from)} – {fmt(to)} · {weeks} {weeks === 1 ? "week" : "weeks"}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}
