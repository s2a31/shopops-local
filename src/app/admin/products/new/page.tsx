import type { Metadata } from "next";

import { ProductForm } from "@/features/admin/products/components/product-form";
import { listGalleryImages } from "@/features/admin/products/gallery";
import { listAdminCategories } from "@/server/services/admin.service";

export const metadata: Metadata = { title: "New product — admin" };

export default async function AdminNewProductPage() {
  const [categories, galleryImages] = await Promise.all([
    listAdminCategories(),
    listGalleryImages(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <div className="mt-6">
        <ProductForm
          categories={categories.map(({ id, name }) => ({ id, name }))}
          galleryImages={galleryImages}
        />
      </div>
    </div>
  );
}
