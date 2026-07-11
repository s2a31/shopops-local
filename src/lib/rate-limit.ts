import { AppError } from "@/lib/errors";

/**
 * Small in-process fixed-window rate limiter for login/registration attempts.
 * Known limitation (documented): state lives in process memory, so it resets on
 * restart and is per-instance. Appropriate for this local, single-process app.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitOptions {
  /** Max attempts per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export function enforceRateLimit(key: string, { limit, windowMs }: RateLimitOptions): void {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a moment and try again.");
  }
}

/** Test helper — clears all rate-limit state. */
export function resetRateLimits(): void {
  windows.clear();
}
