import { z } from "zod";

/** ?page= for order history; anything invalid falls back to the first page. */
export const orderPageSchema = z.coerce.number().int().min(1).max(10_000).catch(1);
