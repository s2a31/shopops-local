"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { formatMoney } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_LINE_QUANTITY } from "@/features/cart/constants";
import { useCartStore } from "@/features/cart/store";
import type { ValidatedCartLine } from "@/server/services/cart.service";

const ISSUE_MESSAGE: Record<string, string> = {
  MISSING: "This product is no longer available.",
  INACTIVE: "This product is no longer sold.",
  OUT_OF_STOCK: "This product is currently out of stock.",
};

export function CartLineItem({
  line,
  compact = false,
}: {
  line: ValidatedCartLine;
  compact?: boolean;
}) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const name = line.product?.name ?? "Unavailable product";
  const maxQuantity = Math.min(line.product?.stockQuantity ?? MAX_LINE_QUANTITY, MAX_LINE_QUANTITY);
  const quantityInputId = `cart-qty-${line.productId}${compact ? "-drawer" : ""}`;

  return (
    <div className="flex gap-3 py-3">
      <div
        className={`shrink-0 overflow-hidden rounded-lg border bg-muted ${compact ? "size-14" : "size-20"}`}
      >
        {line.product?.imageUrl && (
          <Image
            src={line.product.imageUrl}
            alt={line.product.imageAlt ?? ""}
            width={80}
            height={80}
            className="size-full object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {line.product ? (
              <Link href={`/products/${line.product.slug}`} className="hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${name} from cart`}
            onClick={() => removeItem(line.productId)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>

        {line.product && (
          <p className="text-sm text-muted-foreground">
            {formatMoney(line.product.priceCents)} each
          </p>
        )}

        {line.issue && line.issue !== "INSUFFICIENT_STOCK" && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {ISSUE_MESSAGE[line.issue]}
          </p>
        )}
        {line.issue === "INSUFFICIENT_STOCK" && line.product && (
          <p role="alert" className="text-sm font-medium text-destructive">
            Only {line.product.stockQuantity} in stock.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setQuantity(line.productId, line.product!.stockQuantity)}
            >
              Set quantity to {line.product.stockQuantity}
            </button>
          </p>
        )}

        {line.issue === null || line.issue === "INSUFFICIENT_STOCK" ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Decrease quantity of ${name}`}
                disabled={line.requestedQuantity <= 1}
                onClick={() => setQuantity(line.productId, line.requestedQuantity - 1)}
              >
                <Minus aria-hidden="true" />
              </Button>
              <label htmlFor={quantityInputId} className="sr-only">
                Quantity of {name}
              </label>
              <Input
                id={quantityInputId}
                type="number"
                min={1}
                max={maxQuantity}
                value={line.requestedQuantity}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 1) {
                    setQuantity(line.productId, value);
                  }
                }}
                className="h-7 w-14 text-center"
              />
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Increase quantity of ${name}`}
                disabled={line.requestedQuantity >= maxQuantity}
                onClick={() => setQuantity(line.productId, line.requestedQuantity + 1)}
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
            {line.lineTotalCents !== null && (
              <p className="text-sm font-semibold">{formatMoney(line.lineTotalCents)}</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
