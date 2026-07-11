import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CategoriesManager } from "@/features/admin/categories/components/categories-manager";

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CategoriesManager />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const categoryRows = [
  {
    id: "c1",
    name: "Home",
    slug: "home",
    description: "Things for the home.",
    sortOrder: 0,
    _count: { products: 12 },
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CategoriesManager", () => {
  it("lists categories with product counts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(categoryRows)));
    renderManager();

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(screen.getByText("/home")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Home" })).toBeInTheDocument();
  });

  it("opens the create dialog with a labelled form", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
    renderManager();

    await screen.findByText("No categories yet — create the first one.");
    await user.click(screen.getByRole("button", { name: "New category" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("URL slug")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort order")).toBeInTheDocument();
  });

  it("prefills the edit dialog with the category being edited", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(categoryRows)));
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Edit Home" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Home");
    expect(screen.getByLabelText("URL slug")).toHaveValue("home");
    expect(screen.getByLabelText("Description (optional)")).toHaveValue("Things for the home.");
  });
});
