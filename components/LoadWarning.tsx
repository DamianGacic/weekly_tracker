import { cn } from "@/lib/utils";

/**
 * Says which optional parts of a page failed to load, so the numbers shown
 * without them aren't mistaken for complete ones. Renders nothing otherwise.
 */
export function LoadWarning({ missing, className }: { missing: string[]; className?: string }) {
  if (missing.length === 0) return null;
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return (
    <p role="alert" className={cn("text-sm text-destructive", className)}>
      Couldn’t load your {list}, so this page is shown without them. Reload the page to try again.
    </p>
  );
}
