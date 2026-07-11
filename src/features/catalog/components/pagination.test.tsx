import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pagination } from "@/features/catalog/components/pagination";

const hrefFor = (page: number) => `/products?page=${page}`;

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} totalPages={1} hrefFor={hrefFor} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page with aria-current", () => {
    render(<Pagination page={2} totalPages={3} hrefFor={hrefFor} />);
    expect(screen.getByRole("link", { name: "2", current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1" })).not.toHaveAttribute("aria-current");
  });

  it("links previous and next to the adjacent pages", () => {
    render(<Pagination page={2} totalPages={3} hrefFor={hrefFor} />);
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/products?page=1",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/products?page=3");
  });

  it("disables previous on the first page and next on the last", () => {
    render(<Pagination page={1} totalPages={2} hrefFor={hrefFor} />);
    expect(screen.queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next" })).toBeInTheDocument();
  });

  it("is a labelled navigation landmark", () => {
    render(<Pagination page={1} totalPages={2} hrefFor={hrefFor} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });
});
