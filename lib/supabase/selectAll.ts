/** Rows asked for per request; Supabase's default cap ("Max rows" in the API settings). */
const PAGE_SIZE = 1000;

/**
 * Every row a query matches.
 *
 * Supabase answers a single select with at most "Max rows" rows (1000 unless
 * changed in the project's API settings) and gives no sign that it stopped
 * there, so a plain select quietly leaves rows out once a table outgrows it.
 * This fetches page after page until one comes back empty. Each page starts
 * right after the rows actually received, so a server cap below PAGE_SIZE
 * can't make it skip any.
 *
 * `page` must order the rows by something unique (e.g. a timestamp, then
 * `id`), so pages neither overlap nor leave gaps.
 */
export async function selectAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) return rows;
    rows.push(...data);
  }
}
