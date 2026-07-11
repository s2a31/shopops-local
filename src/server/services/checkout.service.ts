import { randomBytes } from "node:crypto";

import { InventoryReason, PaymentMethod, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { calculateLineTotalCents, calculateShippingCents } from "@/lib/money";

import { MAX_LINE_QUANTITY } from "@/features/cart/constants";
import type { CheckoutInput } from "@/features/checkout/schemas";

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
}

export interface CheckoutLineProblem {
  productId: string;
  productName: string | null;
  problem: "MISSING" | "INACTIVE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK";
  availableQuantity: number | null;
}

/**
 * Places an order inside a single transaction:
 *
 *  1. A declined simulated payment aborts BEFORE any write — no order row, no
 *     stock movement, nothing to clean up.
 *  2. Lines are processed in deterministic productId order so concurrent
 *     multi-product checkouts always take row locks in the same sequence
 *     (no deadlocks).
 *  3. Stock is taken with a conditional decrement
 *     (`UPDATE … WHERE stockQuantity >= qty`), not read-then-write: when two
 *     customers race for the last unit, exactly one update matches and the
 *     other checkout rolls back with INSUFFICIENT_STOCK. The DB CHECK
 *     constraint is the final backstop.
 *  4. Prices and names are snapshotted onto the order items, and every
 *     decrement is recorded in the inventory ledger.
 */
export async function placeOrder(userId: string, input: CheckoutInput): Promise<PlacedOrder> {
  if (input.paymentMethod === "SIMULATED_CARD" && input.simulatedOutcome === "DECLINE") {
    throw new AppError(
      "PAYMENT_DECLINED",
      "The simulated card was declined (demo scenario). No order was created — " +
        "your cart is untouched. Pick the approving demo card or cash on delivery.",
    );
  }

  // Merge duplicate ids and sort for deterministic lock ordering.
  const requested = new Map<string, number>();
  for (const item of input.items) {
    requested.set(
      item.productId,
      Math.min(MAX_LINE_QUANTITY, (requested.get(item.productId) ?? 0) + item.quantity),
    );
  }
  const lines = [...requested.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => (a.productId < b.productId ? -1 : 1));

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      select: { id: true, name: true, priceCents: true, stockQuantity: true, isActive: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    // Validate availability up front for clear per-line error details.
    const problems: CheckoutLineProblem[] = [];
    for (const line of lines) {
      const product = productById.get(line.productId);
      if (!product) {
        problems.push({
          productId: line.productId,
          productName: null,
          problem: "MISSING",
          availableQuantity: null,
        });
      } else if (!product.isActive) {
        problems.push({
          productId: line.productId,
          productName: product.name,
          problem: "INACTIVE",
          availableQuantity: null,
        });
      } else if (product.stockQuantity === 0) {
        problems.push({
          productId: line.productId,
          productName: product.name,
          problem: "OUT_OF_STOCK",
          availableQuantity: 0,
        });
      } else if (product.stockQuantity < line.quantity) {
        problems.push({
          productId: line.productId,
          productName: product.name,
          problem: "INSUFFICIENT_STOCK",
          availableQuantity: product.stockQuantity,
        });
      }
    }
    if (problems.length > 0) {
      const stockOnly = problems.every(
        (p) => p.problem === "INSUFFICIENT_STOCK" || p.problem === "OUT_OF_STOCK",
      );
      throw new AppError(
        stockOnly ? "INSUFFICIENT_STOCK" : "CONFLICT",
        "Some items in your cart are not available as requested.",
        { lines: problems },
      );
    }

    // Atomic conditional decrements in sorted order — the concurrency guard.
    for (const line of lines) {
      const updated = await tx.product.updateMany({
        where: { id: line.productId, stockQuantity: { gte: line.quantity } },
        data: { stockQuantity: { decrement: line.quantity } },
      });
      if (updated.count === 0) {
        // A concurrent checkout took the stock between our read and this write.
        const current = await tx.product.findUnique({
          where: { id: line.productId },
          select: { name: true, stockQuantity: true },
        });
        throw new AppError(
          "INSUFFICIENT_STOCK",
          "Someone else just bought the last of an item in your cart.",
          {
            lines: [
              {
                productId: line.productId,
                productName: current?.name ?? null,
                problem: "INSUFFICIENT_STOCK",
                availableQuantity: current?.stockQuantity ?? 0,
              } satisfies CheckoutLineProblem,
            ],
          },
        );
      }
    }

    // Totals from database prices only — client-sent prices never exist.
    const orderItems = lines.map((line) => {
      const product = productById.get(line.productId)!;
      return {
        productId: line.productId,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
        lineTotalCents: calculateLineTotalCents(product.priceCents, line.quantity),
      };
    });
    const subtotalCents = orderItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
    const shippingCents = calculateShippingCents(subtotalCents);

    const numberRows = await tx.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('order_number_seq')`;
    const sequenceValue = numberRows[0]?.nextval;
    if (sequenceValue === undefined) {
      throw new Error("order_number_seq returned no value");
    }

    const isCard = input.paymentMethod === "SIMULATED_CARD";
    const order = await tx.order.create({
      data: {
        orderNumber: `SO-${String(Number(sequenceValue)).padStart(6, "0")}`,
        userId,
        paymentMethod: PaymentMethod[input.paymentMethod],
        paymentStatus: isCard ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paymentRef: isCard ? `SIM-${randomBytes(4).toString("hex")}` : null,
        subtotalCents,
        shippingCents,
        totalCents: subtotalCents + shippingCents,
        shippingName: input.shippingAddress.name,
        shippingPhone: input.shippingAddress.phone ?? null,
        shippingStreet: input.shippingAddress.street,
        shippingCity: input.shippingAddress.city,
        shippingPostalCode: input.shippingAddress.postalCode,
        shippingCountry: input.shippingAddress.country,
        items: { create: orderItems },
      },
      select: { id: true, orderNumber: true },
    });

    await tx.inventoryAdjustment.createMany({
      data: orderItems.map((item) => ({
        productId: item.productId,
        delta: -item.quantity,
        reason: InventoryReason.ORDER_PLACED,
        orderId: order.id,
      })),
    });

    return { orderId: order.id, orderNumber: order.orderNumber };
  });
}
