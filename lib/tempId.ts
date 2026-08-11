let counter = 0;

/** Client-only placeholder id for optimistic UI updates, replaced once the server responds. */
export function nextTempId(): string {
  counter += 1;
  return `temp-${counter}`;
}
