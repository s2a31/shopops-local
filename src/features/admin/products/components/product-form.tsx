"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ApiError, apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminProductFormSchema,
  type AdminProductFormInput,
  type AdminProductFormValues,
} from "@/features/admin/products/schemas";
import type { AdminProductDetail } from "@/server/services/admin.service";

const MAX_IMAGES = 4;

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

/** Derives a readable alt-text starting point from the artwork filename. */
function suggestAltText(url: string): string {
  const base =
    url
      .split("/")
      .pop()
      ?.replace(/\.(svg|webp)$/, "") ?? "";
  return base.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function ProductForm({
  categories,
  galleryImages,
  product,
}: {
  categories: { id: string; name: string }[];
  galleryImages: string[];
  /** Present in edit mode; absent when creating. */
  product?: AdminProductDetail;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminProductFormInput, unknown, AdminProductFormValues>({
    resolver: zodResolver(adminProductFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? "",
      price: product ? (product.priceCents / 100).toFixed(2) : "",
      categoryId: product?.categoryId ?? "",
      images: product?.images.map((image) => ({ url: image.url, altText: image.altText })) ?? [],
      isActive: product?.isActive ?? true,
      lowStockThreshold: product?.lowStockThreshold ?? 5,
      initialStock: product ? 0 : 10,
    },
  });
  const images = useFieldArray({ control, name: "images" });
  const selectedUrls = new Set(images.fields.map((field) => field.url));

  const mutation = useMutation({
    mutationFn: (values: AdminProductFormValues) => {
      const body = {
        name: values.name,
        ...(values.slug !== undefined && { slug: values.slug }),
        description: values.description,
        priceCents: values.price,
        categoryId: values.categoryId,
        images: values.images,
        isActive: values.isActive,
        lowStockThreshold: values.lowStockThreshold,
      };
      return product
        ? apiFetch<AdminProductDetail>(`/api/admin/products/${product.id}`, {
            method: "PATCH",
            body,
          })
        : apiFetch<AdminProductDetail>("/api/admin/products", {
            method: "POST",
            body: { ...body, initialStock: values.initialStock },
          });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(product ? `Saved ${saved.name}.` : `Created ${saved.name}.`);
      router.push("/admin/products");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "CONFLICT") {
          setError("slug", { message: error.message });
          return;
        }
        setSubmitError(error.message);
        return;
      }
      setSubmitError("Something went wrong. Please try again.");
    }
  });

  const fieldError = (id: string, error?: { message?: string }) =>
    error?.message ? (
      <p id={`${id}-error`} className="text-sm text-destructive">
        {error.message}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-8">
      <section aria-labelledby="product-details-heading" className="flex flex-col gap-4">
        <h2 id="product-details-heading" className="text-base font-semibold">
          Details
        </h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-name">Name</Label>
          <Input
            id="product-name"
            type="text"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "product-name-error" : undefined}
            {...register("name")}
          />
          {fieldError("product-name", errors.name)}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-slug">URL slug</Label>
          <Input
            id="product-slug"
            type="text"
            placeholder={product ? undefined : "Left empty, it is derived from the name"}
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby="product-slug-hint"
            {...register("slug")}
          />
          <p id="product-slug-hint" className="text-xs text-muted-foreground">
            {product
              ? "Renaming the product never changes its address — edit this field to change /products/… deliberately."
              : "Lowercase letters, digits and hyphens."}
          </p>
          {fieldError("product-slug", errors.slug)}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-description">Description</Label>
          <Textarea
            id="product-description"
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "product-description-error" : undefined}
            {...register("description")}
          />
          {fieldError("product-description", errors.description)}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-price">Price (€)</Label>
            <Input
              id="product-price"
              type="text"
              inputMode="decimal"
              placeholder="79.90"
              aria-invalid={errors.price ? true : undefined}
              aria-describedby={errors.price ? "product-price-error" : undefined}
              {...register("price")}
            />
            {fieldError("product-price", errors.price)}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-category">Category</Label>
            <select
              id="product-category"
              className={selectClass}
              aria-invalid={errors.categoryId ? true : undefined}
              aria-describedby={errors.categoryId ? "product-category-error" : undefined}
              {...register("categoryId")}
            >
              <option value="">Pick a category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldError("product-category", errors.categoryId)}
          </div>
        </div>
      </section>

      <section aria-labelledby="product-stock-heading" className="flex flex-col gap-4">
        <h2 id="product-stock-heading" className="text-base font-semibold">
          Stock
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {product ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Current stock</span>
              <p className="text-sm">
                {product.stockQuantity} units
                <span className="block text-xs text-muted-foreground">
                  Stock changes only through audited inventory adjustments.
                </span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-initial-stock">Initial stock</Label>
              <Input
                id="product-initial-stock"
                type="number"
                min={0}
                aria-invalid={errors.initialStock ? true : undefined}
                aria-describedby={errors.initialStock ? "product-initial-stock-error" : undefined}
                {...register("initialStock")}
              />
              {fieldError("product-initial-stock", errors.initialStock)}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-low-stock">Low-stock threshold</Label>
            <Input
              id="product-low-stock"
              type="number"
              min={0}
              aria-invalid={errors.lowStockThreshold ? true : undefined}
              aria-describedby={errors.lowStockThreshold ? "product-low-stock-error" : undefined}
              {...register("lowStockThreshold")}
            />
            {fieldError("product-low-stock", errors.lowStockThreshold)}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" {...register("isActive")} />
          Active — visible and purchasable in the storefront
        </label>
      </section>

      <section aria-labelledby="product-images-heading" className="flex flex-col gap-4">
        <h2 id="product-images-heading" className="text-base font-semibold">
          Images
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick up to {MAX_IMAGES} pieces from the local artwork gallery — this project deliberately
          has no image upload.
        </p>

        {images.fields.length > 0 && (
          <ul className="flex flex-col gap-3">
            {images.fields.map((field, index) => (
              <li key={field.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Image
                  src={field.url}
                  alt=""
                  width={64}
                  height={48}
                  className="h-12 w-16 shrink-0 rounded object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label htmlFor={`product-image-alt-${index}`}>
                    Alt text for image {index + 1}
                  </Label>
                  <Input
                    id={`product-image-alt-${index}`}
                    type="text"
                    aria-invalid={errors.images?.[index]?.altText ? true : undefined}
                    {...register(`images.${index}.altText`)}
                  />
                  {fieldError(`product-image-alt-${index}`, errors.images?.[index]?.altText)}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => images.remove(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <fieldset>
          <legend className="sr-only">Gallery</legend>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {galleryImages.map((url) => {
              const selected = selectedUrls.has(url);
              return (
                <li key={url}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${selected ? "Remove" : "Add"} artwork ${suggestAltText(url)}`}
                    disabled={!selected && images.fields.length >= MAX_IMAGES}
                    onClick={() => {
                      if (selected) {
                        images.remove(images.fields.findIndex((field) => field.url === url));
                      } else {
                        images.append({ url, altText: suggestAltText(url) });
                      }
                    }}
                    className="block w-full rounded-lg border p-1 hover:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:opacity-40 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/40"
                  >
                    <Image
                      src={url}
                      alt=""
                      width={96}
                      height={72}
                      className="aspect-4/3 h-auto w-full rounded object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </section>

      <div aria-live="polite">
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            {submitError}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
