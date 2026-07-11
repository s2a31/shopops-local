import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import { enforceRateLimit, resetRateLimits } from "@/lib/rate-limit";

afterEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

describe("enforceRateLimit", () => {
  it("allows attempts up to the limit and rejects beyond it", () => {
    for (let i = 0; i < 3; i++) {
      expect(() => enforceRateLimit("k", { limit: 3, windowMs: 60_000 })).not.toThrow();
    }
    expect(() => enforceRateLimit("k", { limit: 3, windowMs: 60_000 })).toThrow(AppError);
  });

  it("tracks keys independently", () => {
    enforceRateLimit("a", { limit: 1, windowMs: 60_000 });
    expect(() => enforceRateLimit("b", { limit: 1, windowMs: 60_000 })).not.toThrow();
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    enforceRateLimit("k", { limit: 1, windowMs: 60_000 });
    expect(() => enforceRateLimit("k", { limit: 1, windowMs: 60_000 })).toThrow(AppError);
    vi.advanceTimersByTime(60_001);
    expect(() => enforceRateLimit("k", { limit: 1, windowMs: 60_000 })).not.toThrow();
  });
});
