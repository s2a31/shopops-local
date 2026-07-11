import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartPageContent } from "@/features/cart/components/cart-page-content";
import { useCartStore } from "@/features/cart/store";
import type { ValidatedCart, ValidatedCartLine } from "@/server/services/cart.service";

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

const okLine: ValidatedCartLine = {
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
};

const validCart: ValidatedCart = {
  lines: [okLine],
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

describe("CartPageContent", () => {
  it("shows the empty state when the cart has no items", async () => {
    renderWithQuery(<CartPageContent />);
    expect(await screen.findByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse products" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("renders canonical lines and an enabled checkout link when purchasable", async () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 2 }] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(validCart)));

    renderWithQuery(<CartPageContent />);

    expect(await screen.findByRole("link", { name: "Halo Desk Lamp" })).toBeInTheDocument();
    expect(screen.getByText("€79.90 each")).toBeInTheDocument();
    // Appears three times on purpose: line total, subtotal, and grand total
    // (shipping is free above the threshold, so subtotal equals total).
    expect(screen.getAllByText("€159.80")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Proceed to checkout" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });

  it("shows a per-line alert and disables checkout on insufficient stock", async () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 2 }] });
    const cart: ValidatedCart = {
      lines: [
        {
          ...okLine,
          issue: "INSUFFICIENT_STOCK",
          product: { ...okLine.product!, stockQuantity: 1 },
          lineTotalCents: null,
        },
      ],
      purchasable: false,
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(cart)));

    renderWithQuery(<CartPageContent />);

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((a) => a.textContent?.includes("Only 1 in stock"))).toBe(true);
    expect(screen.getByRole("button", { name: "Set quantity to 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proceed to checkout" })).toBeDisabled();
  });

  it("shows the API error state with a retry control", async () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 1 }] });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));

    renderWithQuery(<CartPageContent />);

    expect(await screen.findByText("Could not load your cart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows a labelled loading state while validating", () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 1 }] });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));

    renderWithQuery(<CartPageContent />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading cart…");
  });
});
