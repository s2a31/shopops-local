import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminNav } from "@/components/layout/admin-nav";

const usePathname = vi.hoisted(() => vi.fn<() => string>());
vi.mock("next/navigation", () => ({ usePathname }));

describe("AdminNav", () => {
  it("renders a labelled navigation with all admin sections", () => {
    usePathname.mockReturnValue("/admin");
    render(<AdminNav />);

    const nav = screen.getByRole("navigation", { name: "Admin" });
    const links = ["Dashboard", "Products", "Categories", "Inventory", "Orders", "Customers"];
    for (const name of links) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(nav).toBeInTheDocument();
  });

  it("marks only the dashboard as current on /admin", () => {
    usePathname.mockReturnValue("/admin");
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Products" })).not.toHaveAttribute("aria-current");
  });

  it("marks a section as current for its nested routes, but not the dashboard", () => {
    usePathname.mockReturnValue("/admin/products/abc/edit");
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});
