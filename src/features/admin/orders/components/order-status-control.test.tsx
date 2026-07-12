import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrderStatusControl } from "@/features/admin/orders/components/order-status-control";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

function renderControl(status: "PLACED" | "SHIPPED" | "DELIVERED") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OrderStatusControl orderId="o1" orderNumber="SO-100001" status={status} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe("OrderStatusControl", () => {
  it("offers only the transitions the machine allows", () => {
    renderControl("PLACED");
    const select = screen.getByLabelText("Change status for order SO-100001");
    const options = [...select.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toEqual(["Pick the next status…", "Processing", "Cancelled"]);
  });

  it("explains terminal states instead of rendering a control", () => {
    renderControl("DELIVERED");
    expect(
      screen.getByText("Delivered is a final state — no further transitions."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("submits the picked transition and refreshes on success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ orderNumber: "SO-100001", status: "DELIVERED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderControl("SHIPPED");

    await user.selectOptions(
      screen.getByLabelText("Change status for order SO-100001"),
      "DELIVERED",
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/admin/orders/o1/status");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ status: "DELIVERED" });
    expect(refresh).toHaveBeenCalled();
  });

  it("surfaces a conflict from the server inline", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "CONFLICT", message: "The order changed underneath you." },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    renderControl("PLACED");

    await user.selectOptions(
      screen.getByLabelText("Change status for order SO-100001"),
      "PROCESSING",
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The order changed underneath you.");
  });
});
