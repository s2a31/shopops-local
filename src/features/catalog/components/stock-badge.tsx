import { Badge } from "@/components/ui/badge";

import { STOCK_LABEL, stockState, type StockInfo } from "@/features/catalog/stock";

/** Stock is conveyed by text, never color alone. */
export function StockBadge({ product }: { product: StockInfo }) {
  const state = stockState(product);
  const variant =
    state === "in-stock" ? "secondary" : state === "low-stock" ? "outline" : "destructive";
  return <Badge variant={variant}>{STOCK_LABEL[state]}</Badge>;
}
