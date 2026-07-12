import { OrderStatus } from "@prisma/client";
import { z } from "zod";

/** Filters for the admin order table (?status=&q=&page=). */
export const adminOrderFiltersSchema = z.object({
  status: z.enum(OrderStatus).optional().catch(undefined),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .catch(undefined)
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type AdminOrderFilters = z.infer<typeof adminOrderFiltersSchema>;

/** Body of PATCH /api/admin/orders/[id]/status. */
export const adminOrderStatusSchema = z.object({
  status: z.enum(OrderStatus, { message: "Pick a valid order status." }),
});

export type AdminOrderStatusInput = z.infer<typeof adminOrderStatusSchema>;
