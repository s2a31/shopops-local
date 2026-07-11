import { z } from "zod";

import { cartItemsSchema } from "@/features/cart/schemas";

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(1, "Enter the recipient's name.").max(100),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  street: z.string().trim().min(1, "Enter the street address.").max(200),
  city: z.string().trim().min(1, "Enter the city.").max(100),
  postalCode: z.string().trim().min(1, "Enter the postal code.").max(20),
  country: z.string().trim().min(1, "Enter the country.").max(100),
});

export const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "SIMULATED_CARD"] as const;

/**
 * The simulated card flow never asks for card data — the customer picks a
 * predefined demo scenario instead. DECLINE exercises the failure path
 * without any real payment information existing anywhere.
 */
export const SIMULATED_OUTCOMES = ["APPROVE", "DECLINE"] as const;

const checkoutFields = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  simulatedOutcome: z.enum(SIMULATED_OUTCOMES).optional(),
});

const requiresScenario = (data: z.infer<typeof checkoutFields>) =>
  data.paymentMethod !== "SIMULATED_CARD" || data.simulatedOutcome !== undefined;
const SCENARIO_ERROR = {
  path: ["simulatedOutcome"],
  message: "Choose a demo card scenario.",
};

/**
 * What the customer fills in on the checkout page; cart items join at submit
 * time. An untouched radio group reports null (react-hook-form), which must
 * mean "no scenario chosen yet", not a type error.
 */
export const checkoutFormSchema = checkoutFields
  .extend({
    simulatedOutcome: z
      .enum(SIMULATED_OUTCOMES)
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .refine(requiresScenario, SCENARIO_ERROR);

/** Wire schema for POST /api/checkout. */
export const checkoutSchema = checkoutFields
  .extend({ items: cartItemsSchema.shape.items })
  .refine(requiresScenario, SCENARIO_ERROR);

/** Field values as typed into the form (before the phone-normalizing transform). */
export type CheckoutFormValues = z.input<typeof checkoutFormSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
