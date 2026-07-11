import { create } from "zustand";
import { persist } from "zustand/middleware";

import { MAX_DISTINCT_LINES, MAX_LINE_QUANTITY } from "@/features/cart/constants";

/**
 * The cart is client-owned state: it exists before login and belongs to this
 * browser, persisted to localStorage. It stores ONLY product ids and
 * quantities — prices, names, and stock are always re-fetched from the server
 * (POST /api/cart/validate), so the cart can never display stale prices.
 */
export interface CartLine {
  productId: string;
  quantity: number;
}

export type AddResult = "added" | "updated" | "cart-full";

interface CartState {
  items: CartLine[];
  /** Adds `quantity` to an existing line or creates a new one (clamped to limits). */
  addItem: (productId: string, quantity?: number) => AddResult;
  /** Sets an exact quantity (clamped to 1..MAX_LINE_QUANTITY). */
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const clampQuantity = (quantity: number): number =>
  Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));

/**
 * localStorage contents are user-editable and may come from older app
 * versions — never trust them. Anything malformed is dropped, quantities are
 * clamped, duplicates are merged, and the line limit is enforced.
 */
export function sanitizeCartLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const merged = new Map<string, number>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { productId, quantity } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || productId.length === 0 || productId.length > 64) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) continue;
    const next = Math.min(MAX_LINE_QUANTITY, (merged.get(productId) ?? 0) + Math.trunc(quantity));
    merged.set(productId, next);
    if (merged.size >= MAX_DISTINCT_LINES) break;
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, quantity = 1) => {
        const items = get().items;
        const existing = items.find((line) => line.productId === productId);
        if (existing) {
          set({
            items: items.map((line) =>
              line.productId === productId
                ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
                : line,
            ),
          });
          return "updated";
        }
        if (items.length >= MAX_DISTINCT_LINES) {
          return "cart-full";
        }
        set({ items: [...items, { productId, quantity: clampQuantity(quantity) }] });
        return "added";
      },

      setQuantity: (productId, quantity) => {
        set({
          items: get().items.map((line) =>
            line.productId === productId ? { ...line, quantity: clampQuantity(quantity) } : line,
          ),
        });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((line) => line.productId !== productId) });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "shopops-cart",
      version: 1,
      partialize: (state) => ({ items: state.items }),
      // Sanitize whatever was in localStorage before trusting it.
      merge: (persisted, current) => ({
        ...current,
        items: sanitizeCartLines((persisted as { items?: unknown } | undefined)?.items),
      }),
    },
  ),
);

export const selectCartCount = (state: { items: CartLine[] }): number =>
  state.items.reduce((sum, line) => sum + line.quantity, 0);
