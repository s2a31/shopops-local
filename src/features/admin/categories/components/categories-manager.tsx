"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ApiError, apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCategoryFormSchema,
  type AdminCategoryFormInput,
  type AdminCategoryFormValues,
} from "@/features/admin/categories/schemas";
import type { AdminCategory } from "@/server/services/admin.service";

function CategoryForm({
  category,
  onDone,
}: {
  /** Present when editing; absent when creating. */
  category?: AdminCategory;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminCategoryFormInput, unknown, AdminCategoryFormValues>({
    resolver: zodResolver(adminCategoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      sortOrder: category?.sortOrder ?? 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: AdminCategoryFormValues) =>
      category
        ? apiFetch<AdminCategory>(`/api/admin/categories/${category.id}`, {
            method: "PATCH",
            body: values,
          })
        : apiFetch<AdminCategory>("/api/admin/categories", { method: "POST", body: values }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(category ? `Saved ${saved.name}.` : `Created ${saved.name}.`);
      onDone();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFLICT") {
        setError("name", { message: error.message });
        return;
      }
      setSubmitError(error instanceof ApiError ? error.message : "Something went wrong.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          type="text"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "category-name-error" : undefined}
          {...register("name")}
        />
        {errors.name?.message && (
          <p id="category-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-slug">URL slug</Label>
        <Input
          id="category-slug"
          type="text"
          placeholder={category ? undefined : "Left empty, it is derived from the name"}
          aria-invalid={errors.slug ? true : undefined}
          aria-describedby="category-slug-hint"
          {...register("slug")}
        />
        <p id="category-slug-hint" className="text-xs text-muted-foreground">
          {category
            ? "Renaming never changes the slug — edit this field to change it deliberately."
            : "Lowercase letters, digits and hyphens."}
        </p>
        {errors.slug?.message && <p className="text-sm text-destructive">{errors.slug.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-description">Description (optional)</Label>
        <Textarea id="category-description" rows={3} {...register("description")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-sort">Sort order</Label>
        <Input
          id="category-sort"
          type="number"
          min={0}
          aria-invalid={errors.sortOrder ? true : undefined}
          {...register("sortOrder")}
        />
        {errors.sortOrder?.message && (
          <p className="text-sm text-destructive">{errors.sortOrder.message}</p>
        )}
      </div>

      <div aria-live="polite">
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}

export function CategoriesManager() {
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; category: AdminCategory } | null
  >(null);

  const query = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<AdminCategory[]>("/api/admin/categories"),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialog({ mode: "create" })}>New category</Button>
      </div>

      {query.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only" role="status">
            Loading categories…
          </span>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            The category list could not be loaded. {query.error.message}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.data.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No categories yet — create the first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableCaption className="sr-only">Categories — {query.data.length} total</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Slug</TableHead>
                <TableHead scope="col">Description</TableHead>
                <TableHead scope="col" className="text-right">
                  Sort order
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Products
                </TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">/{category.slug}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {category.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{category.sortOrder}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {category._count.products}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => setDialog({ mode: "edit", category })}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? `Edit ${dialog.category.name}` : "New category"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.mode === "edit"
                ? "Categories cannot be deleted in this version — only renamed and reordered."
                : "Categories group products for browsing and filtering."}
            </DialogDescription>
          </DialogHeader>
          {dialog && (
            <CategoryForm
              category={dialog.mode === "edit" ? dialog.category : undefined}
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
