import { beforeEach, describe, expect, it } from "vitest";

import { verifyOrigin } from "@/lib/api";
import { AppError } from "@/lib/errors";

const APP_URL = "http://localhost:3000";

beforeEach(() => {
  process.env.APP_URL = APP_URL;
});

function requestWithOrigin(origin?: string): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: origin ? { origin } : undefined,
  });
}

describe("verifyOrigin", () => {
  it("accepts a request whose Origin exactly matches APP_URL", () => {
    expect(() => verifyOrigin(requestWithOrigin(APP_URL))).not.toThrow();
  });

  it("rejects a missing Origin header", () => {
    expect(() => verifyOrigin(requestWithOrigin())).toThrow(AppError);
  });

  it("rejects a mismatched Origin", () => {
    expect(() => verifyOrigin(requestWithOrigin("http://evil.example"))).toThrow(AppError);
    expect(() => verifyOrigin(requestWithOrigin("http://localhost:3001"))).toThrow(AppError);
    // Same host, different scheme is still a mismatch.
    expect(() => verifyOrigin(requestWithOrigin("https://localhost:3000"))).toThrow(AppError);
  });

  it("reports the rejection as FORBIDDEN (403)", () => {
    try {
      verifyOrigin(requestWithOrigin("http://evil.example"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("FORBIDDEN");
      expect((error as AppError).httpStatus).toBe(403);
    }
  });
});
