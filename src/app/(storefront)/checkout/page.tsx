import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { CheckoutPageContent } from "@/features/checkout/components/checkout-page-content";
import { getLatestShippingAddressForUser } from "@/server/services/order.service";

export const metadata: Metadata = { title: "Checkout" };

/**
 * Server-side guard: the proxy only checks that a session cookie exists; this
 * page validates the session against the database on every request.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const prefillAddress = await getLatestShippingAddressForUser(user.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutPageContent prefillAddress={prefillAddress} />
    </div>
  );
}
