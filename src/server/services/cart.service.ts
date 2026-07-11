import { prisma } from "@/lib/db";
import { calculateLineTotalCents, calculateShippingCents } from "@/lib/money";

import { MAX_LINE_QUANTITY } from "@/features/cart/constants";

/**
 * Canonical, server-side view of a client cart. The client stores only
 * { productId, quantity }; everything else here — names, prices, stock,
 * activity — comes fresh from the database on every call. Because prices are
 * never cached client-side, a "price changed" conflict is structurally
 * impossible: the UI always shows the price the server would charge.
 */

export type CartLineIssue = "MISSING" | "INACTIVE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK";

export interface ValidatedCartLine {
  productId: string;
  requestedQuantity: number;
  issue: CartLineIssue | null;
  /** Null when the product does not exist. */
  product: {
    name: string;
    slug: string;
    priceCents: number;
    stockQuantity: number;
    isActive: boolean;
    imageUrl: string | null;
    imageAlt: string | null;
  } | null;
  /** Line total at canonical prices; null when the line is not purchasable. */
  lineTotalCents: number | null;
}

export interface ValidatedCart {
  lines: ValidatedCartLine[];
  /** True when every line is purchasable as requested. */
  purchasable: boolean;
  /** Totals over purchasable lines only (issue-free lines). */
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

export async function validateCart(
  items: { productId: string; quantity: number }[],
): Promise<ValidatedCart> {
  // Duplicate product ids are merged (quantities summed, clamped to the line max).
  const requested = new Map<string, number>();
  for (const item of items) {
    requested.set(
      item.productId,
      Math.min(MAX_LINE_QUANTITY, (requested.get(item.productId) ?? 0) + item.quantity),
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...requested.keys()] } },
    select: {
      id: true,
      name: true,
      slug: true,
      priceCents: true,
      stockQuantity: true,
      isActive: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, altText: true } },
    },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const lines: ValidatedCartLine[] = [...requested.entries()].map(([productId, quantity]) => {
    const product = productById.get(productId);
    if (!product) {
      return {
        productId,
        requestedQuantity: quantity,
        issue: "MISSING" as const,
        product: null,
        lineTotalCents: null,
      };
    }

    const issue: CartLineIssue | null = !product.isActive
      ? "INACTIVE"
      : product.stockQuantity === 0
        ? "OUT_OF_STOCK"
        : product.stockQuantity < quantity
          ? "INSUFFICIENT_STOCK"
          : null;

    return {
      productId,
      requestedQuantity: quantity,
      issue,
      product: {
        name: product.name,
        slug: product.slug,
        priceCents: product.priceCents,
        stockQuantity: product.stockQuantity,
        isActive: product.isActive,
        imageUrl: product.images[0]?.url ?? null,
        imageAlt: product.images[0]?.altText ?? null,
      },
      lineTotalCents: issue === null ? calculateLineTotalCents(product.priceCents, quantity) : null,
    };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + (line.lineTotalCents ?? 0), 0);
  const shippingCents = subtotalCents > 0 ? calculateShippingCents(subtotalCents) : 0;

  return {
    lines,
    purchasable: lines.length > 0 && lines.every((line) => line.issue === null),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}
