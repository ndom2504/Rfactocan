/**
 * Keep work alive after the HTTP response on Vercel.
 * Falls back to awaiting when waitUntil is unavailable (local / non-Vercel).
 */
export function scheduleBackground(task: Promise<unknown>) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { waitUntil } = require("@vercel/functions") as {
      waitUntil?: (p: Promise<unknown>) => void;
    };
    if (typeof waitUntil === "function") {
      waitUntil(task);
      return;
    }
  } catch {
    /* package optional at build time */
  }
  void task.catch((error) => console.error("[schedule]", error));
}
