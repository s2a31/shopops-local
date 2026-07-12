import type { Metadata } from "next";

import { OrdersTable } from "@/features/admin/orders/components/orders-table";

export const metadata: Metadata = { title: "Orders — admin" };

export default function AdminOrdersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <div className="mt-6">
        <OrdersTable />
      </div>
    </div>
  );
}
