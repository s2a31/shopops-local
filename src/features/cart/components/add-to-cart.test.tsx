import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { AddToCart } from "@/features/cart/components/add-to-cart";
import { useCartStore } from "@/features/cart/store";

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

describe("AddToCart", () => {
  it("adds the chosen quantity to the cart store", async () => {
    const user = userEvent.setup();
    render(<AddToCart productId="p1" productName="Halo Desk Lamp" stockQuantity={26} />);

    const quantity = screen.getByLabelText("Quantity");
    await user.clear(quantity);
    await user.type(quantity, "3");
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(useCartStore.getState().items).toEqual([{ productId: "p1", quantity: 3 }]);
  });

  it("caps the quantity input at available stock", async () => {
    const user = userEvent.setup();
    render(<AddToCart productId="p1" productName="Beacon Lantern" stockQuantity={2} />);

    const quantity = screen.getByLabelText("Quantity");
    await user.clear(quantity);
    await user.type(quantity, "9");
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(useCartStore.getState().items).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("replaces the control with a status message when out of stock", () => {
    render(<AddToCart productId="p1" productName="Retro FM Radio" stockQuantity={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("out of stock");
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument();
  });
});
