import { z } from "zod";

const categoryFields = z.object({
  name: z.string().trim().min(1, "Enter a category name.").max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and hyphens.")
    .max(80)
    .optional(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
  sortOrder: z.number().int().min(0).max(1_000).optional(),
});

export const adminCategoryCreateSchema = categoryFields;
export const adminCategoryUpdateSchema = categoryFields.partial();

export type AdminCategoryCreateInput = z.infer<typeof adminCategoryCreateSchema>;
export type AdminCategoryUpdateInput = z.infer<typeof adminCategoryUpdateSchema>;
