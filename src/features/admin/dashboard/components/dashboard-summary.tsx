import Link from "next/link";

import { formatMoney } from "@/lib/money";

import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/features/orders/constants";

import type { DashboardSummary } from "@/server/services/admin.service";

export function DashboardSummaryCards({ summary }: { summary: DashboardSummary }) {
  const totalOrders = Object.values(summary.ordersByStatus).reduce((sum, n) => sum + n, 0);

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <section aria-labelledby="dash-revenue" className="rounded-xl border bg-card p-5">
        <h2 id="dash-revenue" className="text-sm font-medium text-muted-foreground">
          Revenue — last 30 days
        </h2>
        <p className="mt-2 text-3xl font-semibold tracking-tight">
          {formatMoney(summary.revenue30dCents)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          All non-cancelled orders placed in the last 30 days.
        </p>
      </section>

      <section aria-labelledby="dash-orders" className="rounded-xl border bg-card p-5">
        <h2 id="dash-orders" className="text-sm font-medium text-muted-foreground">
          Orders by status
        </h2>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{totalOrders}</p>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {Object.entries(summary.ordersByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <dt className="text-muted-foreground">
                {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]}
              </dt>
              <dd className="font-medium">{count}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="dash-low-stock" className="rounded-xl border bg-card p-5">
        <h2 id="dash-low-stock" className="text-sm font-medium text-muted-foreground">
          Low stock
        </h2>
        {summary.lowStock.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Every active product is above its low-stock threshold.
          </p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {summary.lowStock.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/products/${product.slug}`}
                  className="min-w-0 truncate hover:underline"
                >
                  {product.name}
                </Link>
                <Badge variant={product.stockQuantity === 0 ? "destructive" : "secondary"}>
                  {product.stockQuantity === 0 ? "Out of stock" : `${product.stockQuantity} left`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="dash-top" className="rounded-xl border bg-card p-5">
        <h2 id="dash-top" className="text-sm font-medium text-muted-foreground">
          Top products
        </h2>
        {summary.topProducts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sales yet.</p>
        ) : (
          <ol className="mt-3 divide-y text-sm">
            {summary.topProducts.map((product) => (
              <li key={product.productId} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{product.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {product.unitsSold} sold · {formatMoney(product.revenueCents)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
