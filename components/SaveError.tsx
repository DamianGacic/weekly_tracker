/**
 * Says that a change didn't save and was undone on screen. Without it, a
 * failed tap just quietly springs back and is easy to miss.
 */
export function SaveError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="text-sm text-destructive">
      {message}
    </p>
  );
}
