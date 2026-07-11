import type { Metadata } from "next";

import { CartPageContent } from "@/features/cart/components/cart-page-content";

export const metadata: Metadata = { title: "Shopping cart" };

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shopping cart</h1>
      <CartPageContent />
    </div>
  );
}
