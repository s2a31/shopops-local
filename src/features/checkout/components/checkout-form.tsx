"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { ApiError } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/features/cart/store";
import { useCheckout } from "@/features/checkout/hooks/use-checkout";
import {
  checkoutFormSchema,
  type CheckoutFormInput,
  type CheckoutFormValues,
} from "@/features/checkout/schemas";
import type { CheckoutLineProblem, PlacedOrder } from "@/server/services/checkout.service";
import type { ShippingAddressSnapshot } from "@/server/services/order.service";

const ADDRESS_FIELDS = [
  { name: "name", label: "Full name", autoComplete: "name" },
  { name: "phone", label: "Phone (optional)", autoComplete: "tel" },
  { name: "street", label: "Street address", autoComplete: "street-address" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "postalCode", label: "Postal code", autoComplete: "postal-code" },
  { name: "country", label: "Country", autoComplete: "country-name" },
] as const;

const PROBLEM_TEXT: Record<CheckoutLineProblem["problem"], string> = {
  MISSING: "no longer available",
  INACTIVE: "no longer sold",
  OUT_OF_STOCK: "out of stock",
  INSUFFICIENT_STOCK: "not available in the requested quantity",
};

interface SubmitError {
  kind: "declined" | "stock" | "generic";
  message: string;
  lines?: CheckoutLineProblem[];
}

export function CheckoutForm({
  prefillAddress,
  purchasable,
  onPlaced,
}: {
  prefillAddress: ShippingAddressSnapshot | null;
  /** From the cart validation — submitting is pointless while lines have issues. */
  purchasable: boolean;
  onPlaced: (order: PlacedOrder) => void;
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const checkout = useCheckout();
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues, unknown, CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      shippingAddress: {
        name: prefillAddress?.name ?? "",
        phone: prefillAddress?.phone ?? "",
        street: prefillAddress?.street ?? "",
        city: prefillAddress?.city ?? "",
        postalCode: prefillAddress?.postalCode ?? "",
        country: prefillAddress?.country ?? "",
      },
      paymentMethod: "CASH_ON_DELIVERY",
    },
  });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);
    try {
      const order = await checkout.mutateAsync({
        items,
        shippingAddress: input.shippingAddress,
        paymentMethod: input.paymentMethod,
        ...(input.paymentMethod === "SIMULATED_CARD"
          ? { simulatedOutcome: input.simulatedOutcome }
          : {}),
      });
      onPlaced(order);
      clearCart();
      router.push(`/checkout/confirmation/${order.orderId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "PAYMENT_DECLINED") {
          setSubmitError({ kind: "declined", message: error.message });
          return;
        }
        if (error.code === "INSUFFICIENT_STOCK" || error.code === "CONFLICT") {
          const details = error.details as { lines?: CheckoutLineProblem[] } | undefined;
          setSubmitError({ kind: "stock", message: error.message, lines: details?.lines });
          return;
        }
        if (error.code === "UNAUTHORIZED") {
          // Session expired mid-checkout — sign back in and return here.
          router.push("/login?next=/checkout");
          return;
        }
        setSubmitError({ kind: "generic", message: error.message });
        return;
      }
      setSubmitError({ kind: "generic", message: "Something went wrong. Please try again." });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <section aria-labelledby="checkout-address-heading" className="flex flex-col gap-4">
        <h2 id="checkout-address-heading" className="text-base font-semibold">
          Shipping address
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ADDRESS_FIELDS.map((field) => {
            const error = errors.shippingAddress?.[field.name];
            const inputId = `checkout-${field.name}`;
            return (
              <div key={field.name} className="flex flex-col gap-1.5">
                <Label htmlFor={inputId}>{field.label}</Label>
                <Input
                  id={inputId}
                  type="text"
                  autoComplete={field.autoComplete}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${inputId}-error` : undefined}
                  {...register(`shippingAddress.${field.name}`)}
                />
                {error && (
                  <p id={`${inputId}-error`} className="text-sm text-destructive">
                    {error.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold">Payment method</legend>
        <p className="text-sm text-muted-foreground">
          This demo shop never processes real payments and never asks for card details.
        </p>
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary">
          <input
            type="radio"
            value="CASH_ON_DELIVERY"
            className="mt-0.5 accent-primary"
            {...register("paymentMethod")}
          />
          <span>
            <span className="block font-medium">Cash on delivery</span>
            <span className="text-muted-foreground">Pay the courier when your order arrives.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary">
          <input
            type="radio"
            value="SIMULATED_CARD"
            className="mt-0.5 accent-primary"
            {...register("paymentMethod")}
          />
          <span>
            <span className="block font-medium">Simulated card</span>
            <span className="text-muted-foreground">
              Pick a demo scenario — approve or decline. No card number exists anywhere.
            </span>
          </span>
        </label>
      </fieldset>

      {paymentMethod === "SIMULATED_CARD" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold">Demo card scenario</legend>
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary">
            <input
              type="radio"
              value="APPROVE"
              className="mt-0.5 accent-primary"
              {...register("simulatedOutcome")}
            />
            <span>
              <span className="block font-medium">Demo card — approves</span>
              <span className="text-muted-foreground">The simulated payment succeeds.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary">
            <input
              type="radio"
              value="DECLINE"
              className="mt-0.5 accent-primary"
              {...register("simulatedOutcome")}
            />
            <span>
              <span className="block font-medium">Demo card — declines</span>
              <span className="text-muted-foreground">
                The simulated payment fails so you can see the error path.
              </span>
            </span>
          </label>
          {errors.simulatedOutcome && (
            <p role="alert" className="text-sm text-destructive">
              {errors.simulatedOutcome.message}
            </p>
          )}
        </fieldset>
      )}

      <div aria-live="polite">
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            <p className="font-medium">{submitError.message}</p>
            {submitError.lines && submitError.lines.length > 0 && (
              <ul className="mt-2 list-inside list-disc">
                {submitError.lines.map((line) => (
                  <li key={line.productId}>
                    {line.productName ?? "An item"} is {PROBLEM_TEXT[line.problem]}
                    {line.problem === "INSUFFICIENT_STOCK" && line.availableQuantity !== null
                      ? ` (only ${line.availableQuantity} left)`
                      : ""}
                    .
                  </li>
                ))}
              </ul>
            )}
            {submitError.kind === "stock" && (
              <p className="mt-2">
                <Link href="/cart" className="font-medium underline">
                  Review your cart
                </Link>{" "}
                to adjust the affected items.
              </p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting || !purchasable}>
        {isSubmitting ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}
