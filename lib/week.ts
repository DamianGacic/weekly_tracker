const MS_PER_HOUR = 1000 * 60 * 60;
const HOURS_PER_WEEK = 7 * 24;

/** Monday 00:00 local time on/before `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7);
  return d;
}

export function hoursElapsedInWeek(weekStart: Date, now: Date): number {
  const hours = (now.getTime() - weekStart.getTime()) / MS_PER_HOUR;
  return Math.min(Math.max(hours, 0), HOURS_PER_WEEK);
}

/** Fraction (0..1) of the week that has elapsed as of `now`. */
export function weekProgress(weekStart: Date, now: Date): number {
  return hoursElapsedInWeek(weekStart, now) / HOURS_PER_WEEK;
}

/**
 * Average-per-day macro for a week: total/7 once the week has fully
 * elapsed, or total/(hours elapsed so far / 24) while it's still ongoing —
 * so a partial "today" counts as a fraction of a day rather than a whole one.
 */
export function avgDaily(
  total: number,
  { weekStart, now, isCurrentWeek }: { weekStart: Date; now: Date; isCurrentWeek: boolean }
): number {
  if (!isCurrentWeek) return total / 7;
  const fractionalDays = hoursElapsedInWeek(weekStart, now) / 24;
  return fractionalDays > 0 ? total / fractionalDays : 0;
}

export function isSameWeek(a: Date, b: Date): boolean {
  return getWeekStart(a).getTime() === getWeekStart(b).getTime();
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

/**
 * ISO 8601 week number: weeks start Monday, week 1 is the week containing
 * the year's first Thursday — so the ISO week-year can differ from the
 * calendar year for a few days around New Year's.
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Monday=1 ... Sunday=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // move to this week's Thursday
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: isoYear, week };
}

export function formatWeekLabel(weekStart: Date): string {
  const { year, week } = getISOWeek(weekStart);
  return `${year}, week ${week}`;
}
