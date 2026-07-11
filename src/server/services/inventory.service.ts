import { InventoryReason, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

import type { AdminAdjustmentFilters } from "@/features/admin/inventory/schemas";

export interface CreateAdjustmentInput {
  productId: string;
  delta: number;
  reason: "RESTOCK" | "MANUAL_CORRECTION";
  note?: string;
}

const ADJUSTMENTS_PAGE_SIZE = 15;

const ADJUSTMENT_SELECT = {
  id: true,
  delta: true,
  reason: true,
  note: true,
  createdAt: true,
  product: { select: { id: true, name: true, slug: true } },
  order: { select: { id: true, orderNumber: true } },
  actor: { select: { id: true, name: true } },
} satisfies Prisma.InventoryAdjustmentSelect;

export type AdjustmentListItem = Prisma.InventoryAdjustmentGetPayload<{
  select: typeof ADJUSTMENT_SELECT;
}>;

export interface AdjustmentListResult {
  items: AdjustmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AppliedAdjustment {
  adjustment: AdjustmentListItem;
  stockQuantity: number;
}

/**
 * Applies a manual stock adjustment atomically: the guarded update refuses to
 * take stock below zero (same pattern as the checkout decrement), and the
 * ledger row is written in the same transaction — the sum-of-deltas invariant
 * can never be broken halfway.
 */
export async function createAdjustment(
  input: CreateAdjustmentInput,
  actorUserId: string,
): Promise<AppliedAdjustment> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({
      where: { id: input.productId, stockQuantity: { gte: -input.delta } },
      data: { stockQuantity: { increment: input.delta } },
    });
    if (updated.count === 0) {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        select: { stockQuantity: true },
      });
      if (!product) {
        throw new AppError("NOT_FOUND", "Product not found.");
      }
      throw new AppError(
        "CONFLICT",
        `This would take stock below zero — only ${product.stockQuantity} units are left.`,
        { stockQuantity: product.stockQuantity },
      );
    }

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        productId: input.productId,
        delta: input.delta,
        reason: InventoryReason[input.reason],
        note: input.note ?? null,
        actorUserId,
      },
      select: ADJUSTMENT_SELECT,
    });
    const product = await tx.product.findUniqueOrThrow({
      where: { id: input.productId },
      select: { stockQuantity: true },
    });
    return { adjustment, stockQuantity: product.stockQuantity };
  });
}

/** Append-only audit trail, newest first, optionally scoped to one product. */
export async function listAdjustments(
  filters: AdminAdjustmentFilters,
): Promise<AdjustmentListResult> {
  const where: Prisma.InventoryAdjustmentWhereInput = {
    ...(filters.productId && { productId: filters.productId }),
  };

  const total = await prisma.inventoryAdjustment.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADJUSTMENTS_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items = await prisma.inventoryAdjustment.findMany({
    where,
    select: ADJUSTMENT_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ADJUSTMENTS_PAGE_SIZE,
    take: ADJUSTMENTS_PAGE_SIZE,
  });

  return { items, total, page, pageSize: ADJUSTMENTS_PAGE_SIZE, totalPages };
}
