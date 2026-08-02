// Small, dependency-free helpers for drag-and-drop ordering.

/** Move an item within a list and return a new array. */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Apply a saved order (array of keys) over a list of items, using `key` to read
 * each item's stable identity. Unknown keys are ignored; items missing from the
 * order (e.g. newly added) are appended in their original order.
 */
export function applyOrder<T>(
  items: T[],
  order: string[] | undefined,
  key: (item: T) => string
): T[] {
  if (!order || order.length === 0) return items;
  const byKey = new Map(items.map((it) => [key(it), it]));
  const seen = new Set<string>();
  const result: T[] = [];
  for (const k of order) {
    const it = byKey.get(k);
    if (it && !seen.has(k)) {
      result.push(it);
      seen.add(k);
    }
  }
  for (const it of items) if (!seen.has(key(it))) result.push(it);
  return result;
}

/** Same idea for a plain list of strings (image paths). */
export function applyStringOrder(items: string[], order?: string[]): string[] {
  if (!order || order.length === 0) return items;
  const set = new Set(items);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of order) {
    if (set.has(value) && !seen.has(value)) {
      result.push(value);
      seen.add(value);
    }
  }
  for (const value of items) if (!seen.has(value)) result.push(value);
  return result;
}
