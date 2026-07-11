import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductForm } from "@/features/admin/products/components/product-form";
import { listGalleryImages } from "@/features/admin/products/gallery";
import { getAdminProduct, listAdminCategories } from "@/server/services/admin.service";

export const metadata: Metadata = { title: "Edit product — admin" };

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, galleryImages] = await Promise.all([
    getAdminProduct(id),
    listAdminCategories(),
    listGalleryImages(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit {product.name}</h1>
      <div className="mt-6">
        <ProductForm
          categories={categories.map(({ id: categoryId, name }) => ({ id: categoryId, name }))}
          galleryImages={galleryImages}
          product={product}
        />
      </div>
    </div>
  );
}
