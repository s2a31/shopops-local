import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/features/catalog/components/pagination";
import { ORDER_STATUS_BADGE_VARIANTS, ORDER_STATUS_LABELS } from "@/features/orders/constants";
import { orderPageSchema } from "@/features/orders/schemas";
import { listOrdersForUser } from "@/server/services/order.service";

export const metadata: Metadata = { title: "Order history" };

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // The layout redirects guests too, but layouts and pages render in
  // parallel — the page must handle null itself, never assert it away.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const { page: rawPage } = await searchParams;
  const result = await listOrdersForUser(user.id, orderPageSchema.parse(rawPage));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Order history</h1>

      {result.total === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-12 text-center">
          <h2 className="text-lg font-medium">No orders yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When you place an order it shows up here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total === 1 ? "One order" : `${result.total} orders`} so far.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {result.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border bg-card p-4 hover:bg-muted/50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)} ·{" "}
                      {order.itemCount === 1 ? "1 item" : `${order.itemCount} items`}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge variant={ORDER_STATUS_BADGE_VARIANTS[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <span className="font-semibold">{formatMoney(order.totalCents)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              hrefFor={(p) => `/account/orders?page=${p}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
