import { z } from "zod";

/** Filters for the admin customer table (?q=&page=). */
export const adminCustomerFiltersSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .catch(undefined)
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type AdminCustomerFilters = z.infer<typeof adminCustomerFiltersSchema>;
