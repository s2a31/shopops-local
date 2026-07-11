/**
 * Money handling. All amounts are integer minor units (EUR cents) end to end —
 * database, API, and tests. Floating point never touches money math; division
 * by 100 happens only inside formatMoney for display.
 */

export const CURRENCY = "EUR" as const;

/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;

/** Flat shipping fee below the free-shipping threshold. */
export const SHIPPING_FEE_CENTS = 499;

const formatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: CURRENCY,
});

/** The single entry point for displaying money. `formatMoney(129900)` → "€1,299.00". */
export function formatMoney(cents: number): string {
  assertValidCents(cents);
  return formatter.format(cents / 100);
}

export function calculateShippingCents(subtotalCents: number): number {
  assertValidCents(subtotalCents);
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
}

export function calculateLineTotalCents(unitPriceCents: number, quantity: number): number {
  assertValidCents(unitPriceCents);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }
  return unitPriceCents * quantity;
}

function assertValidCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Money amounts must be safe integers (cents), got: ${cents}`);
  }
}
