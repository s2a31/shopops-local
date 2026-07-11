"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_LINE_QUANTITY } from "@/features/cart/constants";
import { useCartStore } from "@/features/cart/store";

interface AddToCartProps {
  productId: string;
  productName: string;
  stockQuantity: number;
}

/** Quantity picker + add button for the product detail page. */
export function AddToCart({ productId, productName, stockQuantity }: AddToCartProps) {
  const addItem = useCartStore((state) => state.addItem);
  // Kept as a string so the field can be emptied while retyping; the clamped
  // numeric value is derived and used everywhere it matters.
  const [rawQuantity, setRawQuantity] = useState("1");

  const outOfStock = stockQuantity <= 0;
  const maxQuantity = Math.min(stockQuantity, MAX_LINE_QUANTITY);
  const parsed = Number.parseInt(rawQuantity, 10);
  const quantity = Number.isNaN(parsed) ? 1 : Math.min(maxQuantity, Math.max(1, parsed));

  function handleAdd() {
    const result = addItem(productId, quantity);
    if (result === "cart-full") {
      toast.error("Your cart is full (50 different products). Remove something first.");
      return;
    }
    toast.success(`Added ${productName} to cart`);
  }

  if (outOfStock) {
    return (
      <p role="status" className="text-sm font-medium text-muted-foreground">
        This product is currently out of stock.
      </p>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="add-quantity">Quantity</Label>
        <Input
          id="add-quantity"
          type="number"
          min={1}
          max={maxQuantity}
          value={rawQuantity}
          onChange={(event) => setRawQuantity(event.target.value)}
          onBlur={() => setRawQuantity(String(quantity))}
          className="w-20"
        />
      </div>
      <Button size="lg" onClick={handleAdd}>
        Add to cart
      </Button>
    </div>
  );
}
