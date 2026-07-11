import { z } from "zod";

/** The only reasons an admin may pick; system reasons are written by services. */
export const MANUAL_ADJUSTMENT_REASONS = ["RESTOCK", "MANUAL_CORRECTION"] as const;

export const adminAdjustmentCreateSchema = z.object({
  productId: z.string().min(1, "Pick a product."),
  delta: z
    .number({ message: "Enter a whole number of units." })
    .int("Whole units only.")
    .min(-100_000)
    .max(100_000)
    .refine((value) => value !== 0, "A zero adjustment changes nothing."),
  reason: z.enum(MANUAL_ADJUSTMENT_REASONS, { message: "Pick a reason." }),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type AdminAdjustmentCreateInput = z.infer<typeof adminAdjustmentCreateSchema>;

/** What the adjustment dialog validates; delta arrives as text from a number input. */
export const adminAdjustmentFormSchema = z.object({
  delta: z.coerce
    .number({ message: "Enter a whole number of units." })
    .int("Whole units only.")
    .min(-100_000)
    .max(100_000)
    .refine((value) => value !== 0, "A zero adjustment changes nothing."),
  reason: z.enum(MANUAL_ADJUSTMENT_REASONS, { message: "Pick a reason." }),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value ? value : undefined)),
});

export type AdminAdjustmentFormInput = z.input<typeof adminAdjustmentFormSchema>;
export type AdminAdjustmentFormValues = z.output<typeof adminAdjustmentFormSchema>;

/** Filters for the audit log (?productId=&page=). */
export const adminAdjustmentFiltersSchema = z.object({
  productId: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type AdminAdjustmentFilters = z.infer<typeof adminAdjustmentFiltersSchema>;
