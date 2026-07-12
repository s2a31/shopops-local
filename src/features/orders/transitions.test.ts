import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { ADMIN_STATUS_TRANSITIONS, canTransition } from "@/features/orders/transitions";

describe("order status machine", () => {
  it("allows exactly the planned transitions", () => {
    expect(ADMIN_STATUS_TRANSITIONS.PLACED).toEqual(["PROCESSING", "CANCELLED"]);
    expect(ADMIN_STATUS_TRANSITIONS.PROCESSING).toEqual(["SHIPPED", "CANCELLED"]);
    expect(ADMIN_STATUS_TRANSITIONS.SHIPPED).toEqual(["DELIVERED"]);
    expect(ADMIN_STATUS_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ADMIN_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("covers every status and rejects everything not listed", () => {
    const statuses = Object.values(OrderStatus);
    expect(Object.keys(ADMIN_STATUS_TRANSITIONS).sort()).toEqual([...statuses].sort());

    const allowed = new Set(
      statuses.flatMap((from) => ADMIN_STATUS_TRANSITIONS[from].map((to) => `${from}->${to}`)),
    );
    for (const from of statuses) {
      for (const to of statuses) {
        expect(canTransition(from, to)).toBe(allowed.has(`${from}->${to}`));
      }
    }
  });

  it("never allows leaving a terminal state or self-transitions", () => {
    for (const from of Object.values(OrderStatus)) {
      expect(canTransition(from, from)).toBe(false);
    }
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "PLACED")).toBe(false);
  });
});
