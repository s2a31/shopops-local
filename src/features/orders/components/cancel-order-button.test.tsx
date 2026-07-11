import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CancelOrderButton } from "@/features/orders/components/cancel-order-button";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  refresh.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CancelOrderButton", () => {
  it("asks for confirmation before doing anything", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithQuery(<CancelOrderButton orderId="o1" orderNumber="SO-001042" />);

    await user.click(screen.getByRole("button", { name: "Cancel order" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("Cancel order SO-001042?");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels on confirm, then refreshes the page data", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "o1", status: "CANCELLED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithQuery(<CancelOrderButton orderId="o1" orderNumber="SO-001042" />);

    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel order" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders/o1/cancel",
      expect.objectContaining({ method: "POST" }),
    );
    expect(toastSuccess).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("surfaces the server's message when cancellation is no longer allowed", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "CONFLICT", message: "This order can no longer be cancelled." },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    renderWithQuery(<CancelOrderButton orderId="o1" orderNumber="SO-001042" />);

    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel order" }));

    expect(toastError).toHaveBeenCalledWith("This order can no longer be cancelled.");
    expect(refresh).toHaveBeenCalled();
  });
});
