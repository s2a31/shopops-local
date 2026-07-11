import { describe, expect, it } from "vitest";

import { adminCategoryFormSchema } from "@/features/admin/categories/schemas";

describe("adminCategoryFormSchema", () => {
  it("treats empty optional fields as not provided", () => {
    const parsed = adminCategoryFormSchema.parse({
      name: "Kitchen",
      slug: "",
      description: "",
      sortOrder: "0",
    });
    expect(parsed).toEqual({
      name: "Kitchen",
      slug: undefined,
      description: undefined,
      sortOrder: 0,
    });
  });

  it("keeps provided values and coerces sort order", () => {
    const parsed = adminCategoryFormSchema.parse({
      name: "Kitchen",
      slug: "kitchen-tools",
      description: "Tools for cooks.",
      sortOrder: "7",
    });
    expect(parsed).toEqual({
      name: "Kitchen",
      slug: "kitchen-tools",
      description: "Tools for cooks.",
      sortOrder: 7,
    });
  });

  it("rejects an invalid slug shape", () => {
    expect(
      adminCategoryFormSchema.safeParse({
        name: "Kitchen",
        slug: "Kitchen Tools",
        description: "",
        sortOrder: "0",
      }).success,
    ).toBe(false);
  });
});
