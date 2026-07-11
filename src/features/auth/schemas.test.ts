import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/features/auth/schemas";

describe("registerSchema", () => {
  it("accepts valid input and normalizes the email", () => {
    const result = registerSchema.parse({
      email: "  Demo.User@Example.COM ",
      password: "longenough1",
      name: "  Demo User ",
    });
    expect(result.email).toBe("demo.user@example.com");
    expect(result.name).toBe("Demo User");
  });

  it("rejects invalid emails", () => {
    expect(
      registerSchema.safeParse({ email: "nope", password: "longenough1", name: "A" }).success,
    ).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(
      registerSchema.safeParse({ email: "a@b.com", password: "short", name: "A" }).success,
    ).toBe(false);
  });

  it("rejects empty names", () => {
    expect(
      registerSchema.safeParse({ email: "a@b.com", password: "longenough1", name: "  " }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("does not enforce password rules beyond non-emptiness", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
