import { describe, expect, it } from "vitest";

import { formatDate } from "@/lib/dates";

describe("formatDate", () => {
  it("formats a date in the en-IE medium style", () => {
    expect(formatDate(new Date("2026-07-11T12:00:00Z"))).toBe("11 Jul 2026");
  });
});
