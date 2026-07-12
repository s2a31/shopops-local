import type { Metadata } from "next";

import { CustomersTable } from "@/features/admin/customers/components/customers-table";

export const metadata: Metadata = { title: "Customers — admin" };

export default function AdminCustomersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
      <div className="mt-6">
        <CustomersTable />
      </div>
    </div>
  );
}
