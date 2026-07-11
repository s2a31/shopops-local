import type { Metadata } from "next";

import { InventoryManager } from "@/features/admin/inventory/components/inventory-manager";

export const metadata: Metadata = { title: "Inventory — admin" };

export default function AdminInventoryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
      <div className="mt-6">
        <InventoryManager />
      </div>
    </div>
  );
}
