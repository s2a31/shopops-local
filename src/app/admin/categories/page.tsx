import type { Metadata } from "next";

import { CategoriesManager } from "@/features/admin/categories/components/categories-manager";

export const metadata: Metadata = { title: "Categories — admin" };

export default function AdminCategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <div className="mt-6">
        <CategoriesManager />
      </div>
    </div>
  );
}
