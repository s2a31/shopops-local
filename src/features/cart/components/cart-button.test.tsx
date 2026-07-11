import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CartButton } from "@/features/cart/components/cart-button";
import { useCartStore } from "@/features/cart/store";

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

describe("CartButton", () => {
  it("announces the item count in its accessible name", () => {
    useCartStore.setState({
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 1 },
      ],
    });
    render(<CartButton />);
    expect(screen.getByRole("button", { name: "Open cart (3 items)" })).toBeInTheDocument();
  });

  it("uses singular phrasing for one item", () => {
    useCartStore.setState({ items: [{ productId: "p1", quantity: 1 }] });
    render(<CartButton />);
    expect(screen.getByRole("button", { name: "Open cart (1 item)" })).toBeInTheDocument();
  });

  it("shows no numeric badge for an empty cart", () => {
    render(<CartButton />);
    expect(screen.getByRole("button", { name: "Open cart (0 items)" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
