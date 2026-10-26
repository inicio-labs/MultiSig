/**
 * Keeps state that did not change: a sync reads the account afresh, and
 * handing React an equal but new object makes every component that uses it
 * render again (and effects keyed on it run again), so only real changes
 * should replace what is shown.
 */

/** Structural equality for plain data: primitives (bigint included), arrays, Maps, byte arrays and plain objects. */
export function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameData(item, b[i]));
  }
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !sameData(value, b.get(key))) return false;
    }
    return true;
  }
  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    return a instanceof Uint8Array && b instanceof Uint8Array && a.length === b.length && a.every((byte, i) => byte === b[i]);
  }
  if (Object.getPrototypeOf(a) !== Object.prototype || Object.getPrototypeOf(b) !== Object.prototype) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key)
    && sameData((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

/**
 * The value to keep as state: `current` when the update returned it, else a
 * copy of `next`. The SDK changes its own objects in place (a proposal's
 * verification), so state that held them could change without React knowing,
 * and a later "same data?" check would compare against the changed object.
 */
export function copyUnlessSame<T>(current: T, next: T): T {
  return next === current ? current : structuredClone(next);
}

/** A state updater that keeps the current value when `next` holds the same data. */
export function keepIfSame<T>(next: T): (current: T) => T {
  return (current) => (sameData(current, next) ? current : next);
}
