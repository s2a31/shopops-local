import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { useCartStore } from "@/features/cart/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return jsonResponse(status, {
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Street address"), "1 Analytical Row");
  await user.type(screen.getByLabelText("City"), "Dublin");
  await user.type(screen.getByLabelText("Postal code"), "D01");
  await user.type(screen.getByLabelText("Country"), "Ireland");
}

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [{ productId: "p1", quantity: 2 }] });
  push.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CheckoutForm", () => {
  it("defaults to cash on delivery and hides the demo scenarios", () => {
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable onPlaced={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /Cash on delivery/ })).toBeChecked();
    expect(screen.queryByRole("radio", { name: /Demo card — approves/ })).not.toBeInTheDocument();
  });

  it("reveals the demo scenarios when the simulated card is selected", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable onPlaced={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /Simulated card/ }));

    expect(screen.getByRole("radio", { name: /Demo card — approves/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Demo card — declines/ })).toBeInTheDocument();
  });

  it("prefills the address from the most recent order", () => {
    renderWithQuery(
      <CheckoutForm
        prefillAddress={{
          name: "Ada Lovelace",
          phone: null,
          street: "1 Analytical Row",
          city: "Dublin",
          postalCode: "D01",
          country: "Ireland",
        }}
        purchasable
        onPlaced={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("Country")).toHaveValue("Ireland");
  });

  it("shows accessible validation errors and sends nothing for an empty form", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable onPlaced={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Place order" }));

    const nameInput = screen.getByLabelText("Full name");
    expect(nameInput).toHaveAccessibleDescription("Enter the recipient's name.");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a demo scenario before a simulated-card order", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable onPlaced={vi.fn()} />);

    await fillAddress(user);
    await user.click(screen.getByRole("radio", { name: /Simulated card/ }));
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a demo card scenario.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("places the order, clears the cart, and navigates to the confirmation", async () => {
    const user = userEvent.setup();
    const onPlaced = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { orderId: "o1", orderNumber: "SO-001042" }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable onPlaced={onPlaced} />);

    await fillAddress(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(onPlaced).toHaveBeenCalledWith({ orderId: "o1", orderNumber: "SO-001042" });
    expect(useCartStore.getState().items).toEqual([]);
    expect(push).toHaveBeenCalledWith("/checkout/confirmation/o1");

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.items).toEqual([{ productId: "p1", quantity: 2 }]);
    expect(body.paymentMethod).toBe("CASH_ON_DELIVERY");
    expect(body).not.toHaveProperty("simulatedOutcome");
  });

  it("shows the decline error inline and keeps the cart intact", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          errorResponse(402, "PAYMENT_DECLINED", "The simulated card was declined."),
        ),
    );
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable onPlaced={vi.fn()} />);

    await fillAddress(user);
    await user.click(screen.getByRole("radio", { name: /Simulated card/ }));
    await user.click(screen.getByRole("radio", { name: /Demo card — declines/ }));
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The simulated card was declined.");
    expect(useCartStore.getState().items).toEqual([{ productId: "p1", quantity: 2 }]);
    expect(push).not.toHaveBeenCalled();
  });

  it("lists the affected items and links to the cart on a stock conflict", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        errorResponse(409, "INSUFFICIENT_STOCK", "Some items are not available.", {
          lines: [
            {
              productId: "p1",
              productName: "Beacon Lantern",
              problem: "INSUFFICIENT_STOCK",
              availableQuantity: 1,
            },
          ],
        }),
      ),
    );
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable onPlaced={vi.fn()} />);

    await fillAddress(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Beacon Lantern");
    expect(alert).toHaveTextContent("only 1 left");
    expect(screen.getByRole("link", { name: "Review your cart" })).toHaveAttribute("href", "/cart");
  });

  it("disables the submit button while the cart is not purchasable", () => {
    renderWithQuery(<CheckoutForm prefillAddress={null} purchasable={false} onPlaced={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();
  });
});
