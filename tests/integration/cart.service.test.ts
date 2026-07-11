import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { SHIPPING_FEE_CENTS } from "@/lib/money";

import { validateCart } from "@/server/services/cart.service";

import { resetDb } from "../helpers/db";

let ids: Record<string, string>;

beforeEach(async () => {
  await resetDb();
  const category = await prisma.category.create({
    data: { name: "Lighting", slug: "lighting" },
  });
  const make = (
    name: string,
    slug: string,
    priceCents: number,
    stockQuantity: number,
    isActive = true,
  ) =>
    prisma.product.create({
      data: {
        name,
        slug,
        description: name,
        priceCents,
        stockQuantity,
        isActive,
        categoryId: category.id,
      },
    });

  const lamp = await make("Halo Desk Lamp", "halo-desk-lamp", 7990, 26);
  const lantern = await make("Beacon Lantern", "beacon-lantern", 4490, 2);
  const radio = await make("Retro FM Radio", "retro-fm-radio", 6490, 0);
  const hidden = await make("Hidden Lamp", "hidden-lamp", 999, 10, false);
  ids = { lamp: lamp.id, lantern: lantern.id, radio: radio.id, hidden: hidden.id };
});

describe("validateCart", () => {
  it("returns canonical product data and totals for a purchasable cart", async () => {
    const cart = await validateCart([{ productId: ids.lamp!, quantity: 2 }]);

    expect(cart.purchasable).toBe(true);
    expect(cart.lines[0]).toMatchObject({
      issue: null,
      requestedQuantity: 2,
      lineTotalCents: 15980,
      product: { name: "Halo Desk Lamp", priceCents: 7990, stockQuantity: 26 },
    });
    expect(cart.subtotalCents).toBe(15980);
    expect(cart.shippingCents).toBe(0); // over the free-shipping threshold
    expect(cart.totalCents).toBe(15980);
  });

  it("charges shipping below the free-shipping threshold", async () => {
    const cart = await validateCart([{ productId: ids.lantern!, quantity: 1 }]);
    expect(cart.shippingCents).toBe(SHIPPING_FEE_CENTS);
    expect(cart.totalCents).toBe(4490 + SHIPPING_FEE_CENTS);
  });

  it("flags missing, inactive, out-of-stock, and insufficient-stock lines", async () => {
    const cart = await validateCart([
      { productId: "no-such-product", quantity: 1 },
      { productId: ids.hidden!, quantity: 1 },
      { productId: ids.radio!, quantity: 1 },
      { productId: ids.lantern!, quantity: 5 },
    ]);

    const issues = Object.fromEntries(cart.lines.map((l) => [l.productId, l.issue]));
    expect(issues["no-such-product"]).toBe("MISSING");
    expect(issues[ids.hidden!]).toBe("INACTIVE");
    expect(issues[ids.radio!]).toBe("OUT_OF_STOCK");
    expect(issues[ids.lantern!]).toBe("INSUFFICIENT_STOCK");
    expect(cart.purchasable).toBe(false);
    // Problem lines contribute nothing to the totals.
    expect(cart.subtotalCents).toBe(0);
    expect(cart.totalCents).toBe(0);
  });

  it("keeps canonical stock on insufficient-stock lines so the UI can offer a fix", async () => {
    const cart = await validateCart([{ productId: ids.lantern!, quantity: 5 }]);
    expect(cart.lines[0]?.product?.stockQuantity).toBe(2);
    expect(cart.lines[0]?.lineTotalCents).toBeNull();
  });

  it("merges duplicate product ids by summing quantities", async () => {
    const cart = await validateCart([
      { productId: ids.lamp!, quantity: 1 },
      { productId: ids.lamp!, quantity: 2 },
    ]);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.requestedQuantity).toBe(3);
    expect(cart.lines[0]?.lineTotalCents).toBe(3 * 7990);
  });

  it("mixed carts still total only the purchasable lines", async () => {
    const cart = await validateCart([
      { productId: ids.lamp!, quantity: 1 },
      { productId: ids.radio!, quantity: 1 },
    ]);
    expect(cart.purchasable).toBe(false);
    expect(cart.subtotalCents).toBe(7990);
    expect(cart.shippingCents).toBe(0);
  });
});
