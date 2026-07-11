import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductForm } from "@/features/admin/products/components/product-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductForm
        categories={[{ id: "c1", name: "Home" }]}
        galleryImages={["/images/products/halo-desk-lamp.svg", "/images/products/compass-mug.svg"]}
      />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("ProductForm", () => {
  it("shows field-level validation messages on an empty submit", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Create product" }));

    expect(await screen.findByText("Enter a product name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a description.")).toBeInTheDocument();
    expect(screen.getByText("Enter a price.")).toBeInTheDocument();
    expect(screen.getByText("Pick a category.")).toBeInTheDocument();
  });

  it("adds a gallery image with a suggested alt text and can remove it", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Add artwork Halo desk lamp" }));

    const altInput = screen.getByLabelText("Alt text for image 1");
    expect(altInput).toHaveValue("Halo desk lamp");
    expect(screen.getByRole("button", { name: "Remove artwork Halo desk lamp" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByLabelText("Alt text for image 1")).not.toBeInTheDocument();
  });

  it("submits integer cents and omits an empty slug", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: "p1", name: "Halo Desk Lamp" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Halo Desk Lamp");
    await user.type(screen.getByLabelText("Description"), "A lamp.");
    await user.type(screen.getByLabelText("Price (€)"), "79,90");
    await user.selectOptions(screen.getByLabelText("Category"), "c1");
    await user.click(screen.getByRole("button", { name: "Create product" }));

    expect(await screen.findByRole("button", { name: "Create product" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/admin/products");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.priceCents).toBe(7990);
    expect(body.initialStock).toBe(10);
    expect("slug" in body).toBe(false);
    expect(push).toHaveBeenCalledWith("/admin/products");
  });
});
