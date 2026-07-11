import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutPageContent } from "@/features/checkout/components/checkout-page-content";
import { useCartStore } from "@/features/cart/store";
import type { ValidatedCart } from "@/server/services/cart.service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const validCart: ValidatedCart = {
  lines: [
    {
      productId: "p1",
      requestedQuantity: 2,
      issue: null,
      product: {
        name: "Halo Desk Lamp",
        slug: "halo-desk-lamp",
        priceCents: 7990,
        stockQuantity: 26,
        isActive: true,
        imageUrl: null,
        imageAlt: null,
      },
      lineTotalCents: 15980,
    },
  ],
  purchasable: true,
  subtotalCents: 15980,
  shippingCents: 0,
  totalCents: 15980,
};

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CheckoutPageContent", () => {
  it("shows the empty state when the cart has no items", async () => {
    renderWithQuery(<CheckoutPageContent prefillAddress={null} />);
    expect(await screen.findByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse products" })).toBeInTheDocument();
  });

  it("renders the form and the order summary for a purchasable cart", async () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 2 }] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(validCart)));

    renderWithQuery(<CheckoutPageContent prefillAddress={null} />);

    expect(await screen.findByRole("heading", { name: "Shipping address" })).toBeInTheDocument();
    const summary = screen.getByRole("complementary", { name: "Order summary" });
    expect(summary).toHaveTextContent("Halo Desk Lamp");
    expect(summary).toHaveTextContent("Qty 2");
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
  });

  it("warns and disables ordering when a line has issues", async () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 2 }] });
    const cart: ValidatedCart = {
      ...validCart,
      purchasable: false,
      lines: [
        {
          ...validCart.lines[0]!,
          issue: "INSUFFICIENT_STOCK",
          product: { ...validCart.lines[0]!.product!, stockQuantity: 1 },
          lineTotalCents: null,
        },
      ],
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(cart)));

    renderWithQuery(<CheckoutPageContent prefillAddress={null} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some items in your cart are not available as requested.",
    );
    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();
  });

  it("shows a labelled loading state while validating", () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 1 }] });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));

    renderWithQuery(<CheckoutPageContent prefillAddress={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading checkout…");
  });

  it("shows the API error state with a retry control", async () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 1 }] });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));

    renderWithQuery(<CheckoutPageContent prefillAddress={null} />);

    expect(await screen.findByText("Could not load your cart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
