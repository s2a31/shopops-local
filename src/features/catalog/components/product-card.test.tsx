import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/features/catalog/components/product-card";

const product = {
  id: "p1",
  name: "Halo Desk Lamp",
  slug: "halo-desk-lamp",
  priceCents: 7990,
  stockQuantity: 26,
  lowStockThreshold: 5,
  images: [{ url: "/images/products/halo-desk-lamp.svg", altText: "Halo Desk Lamp artwork" }],
};

describe("ProductCard", () => {
  it("links the product name to its detail page", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole("link", { name: "Halo Desk Lamp" })).toHaveAttribute(
      "href",
      "/products/halo-desk-lamp",
    );
  });

  it("shows the formatted price and stock state", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText("€79.90")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("renders the artwork with its alt text", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole("img", { name: "Halo Desk Lamp artwork" })).toBeInTheDocument();
  });
});
