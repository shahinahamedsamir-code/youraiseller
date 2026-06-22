/**
 * Shared "data changed" signal for the app.
 *
 * Many stores write in quick succession (e.g. a POS sale touches accounting,
 * orders and the cash register; a Woo sync saves many orders in a loop). Each
 * write used to fire its own event, so every mounted listener re-rendered once
 * per write. emitDataUpdated() coalesces a burst within the same task into a
 * single event so listeners refresh once.
 */
export const DATA_UPDATED_EVENT = "youraiseller-data-updated";

let scheduled = false;

export function emitDataUpdated(): void {
  if (typeof window === "undefined") return;
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
  });
}
