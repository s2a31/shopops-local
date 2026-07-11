import { z } from "zod";

export const ADMIN_PRODUCT_STATUS_FILTERS = ["all", "active", "inactive"] as const;
export type AdminProductStatusFilter = (typeof ADMIN_PRODUCT_STATUS_FILTERS)[number];

/** Filters for the admin product table (?q=&status=&category=&lowStock=&page=). */
export const adminProductFiltersSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => (v ? v : undefined)),
  status: z.enum(ADMIN_PRODUCT_STATUS_FILTERS).catch("all"),
  category: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => (v ? v : undefined)),
  lowStock: z.preprocess((v) => v === "true" || v === true, z.boolean()).catch(false),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type AdminProductFilters = z.infer<typeof adminProductFiltersSchema>;

const productImageSchema = z.object({
  /** Only committed gallery artwork is addressable — no uploads, no remote URLs. */
  url: z
    .string()
    .regex(
      /^\/images\/products\/[a-z0-9-]+\.(svg|webp)$/,
      "Images must come from the local product gallery.",
    ),
  altText: z.string().trim().min(1, "Describe the image for screen readers.").max(200),
});

const productFields = z.object({
  name: z.string().trim().min(1, "Enter a product name.").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and hyphens.")
    .max(80)
    .optional(),
  description: z.string().trim().min(1, "Enter a description.").max(2000),
  priceCents: z
    .number({ message: "Enter a price in cents." })
    .int("Prices are integer cents.")
    .min(1, "The price must be positive.")
    .max(10_000_000),
  categoryId: z.string().min(1, "Pick a category."),
  images: z.array(productImageSchema).max(4),
  isActive: z.boolean(),
  lowStockThreshold: z.number().int().min(0).max(1_000),
});

export const adminProductCreateSchema = productFields.extend({
  initialStock: z.number().int().min(0, "Stock cannot be negative.").max(100_000),
});

/** Partial update; stock is deliberately absent — it changes only through audited inventory adjustments. */
export const adminProductUpdateSchema = productFields.partial();

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;

/**
 * The admin form's price field: euros as typed ("79.90" or "79,90") converted
 * to integer cents at the validation boundary — money math stays integral
 * everywhere past this point.
 */
const priceEurosField = z
  .string()
  .trim()
  .min(1, "Enter a price.")
  .regex(/^\d+([.,]\d{1,2})?$/, "Use a price like 79.90 with at most two decimals.")
  .transform((value) => Math.round(Number(value.replace(",", ".")) * 100))
  .refine((cents) => cents >= 1, "The price must be at least €0.01.")
  .refine((cents) => cents <= 10_000_000, "The price cannot exceed €100,000.");

/** What the product form validates; distinct from the wire schemas above. */
export const adminProductFormSchema = z.object({
  name: productFields.shape.name,
  slug: z
    .string()
    .trim()
    .regex(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and hyphens.")
    .max(80)
    .transform((value) => (value === "" ? undefined : value)),
  description: productFields.shape.description,
  price: priceEurosField,
  categoryId: productFields.shape.categoryId,
  images: z.array(productImageSchema).max(4),
  isActive: z.boolean(),
  lowStockThreshold: z.coerce.number<number>().int().min(0, "Cannot be negative.").max(1_000),
  initialStock: z.coerce
    .number<number>()
    .int("Whole units only.")
    .min(0, "Stock cannot be negative.")
    .max(100_000),
});

export type AdminProductFormInput = z.input<typeof adminProductFormSchema>;
export type AdminProductFormValues = z.output<typeof adminProductFormSchema>;
