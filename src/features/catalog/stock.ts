export type StockState = "in-stock" | "low-stock" | "out-of-stock";

export interface StockInfo {
  stockQuantity: number;
  lowStockThreshold: number;
}

export function stockState(product: StockInfo): StockState {
  if (product.stockQuantity <= 0) return "out-of-stock";
  if (product.stockQuantity <= product.lowStockThreshold) return "low-stock";
  return "in-stock";
}

export const STOCK_LABEL: Record<StockState, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
};
