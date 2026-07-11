import { beforeEach, describe, expect, it } from "vitest";

import {
  createSession,
  hashSessionToken,
  invalidateSession,
  SESSION_DURATION_MS,
  validateSessionToken,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

import { loginUser, registerUser } from "@/server/services/auth.service";

import { resetDb } from "../helpers/db";

const INPUT = { email: "test.user@example.com", password: "longenough1", name: "Test User" };

beforeEach(async () => {
  await resetDb();
});

describe("registerUser", () => {
  it("creates a user with a hashed password and an active session", async () => {
    const result = await registerUser(INPUT);

    expect(result.user).toMatchObject({ email: INPUT.email, name: INPUT.name, role: "CUSTOMER" });
    expect(result.token).toBeTruthy();

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: INPUT.email } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain(INPUT.password);

    const session = await validateSessionToken(result.token);
    expect(session?.user.id).toBe(result.user.id);
  });

  it("rejects a duplicate email with CONFLICT", async () => {
    await registerUser(INPUT);
    await expect(registerUser({ ...INPUT, name: "Other" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("never assigns the admin role, regardless of input shape", async () => {
    // Simulates a tampered payload that snuck extra fields past the client.
    const tampered = { ...INPUT, role: "ADMIN" } as typeof INPUT;
    const result = await registerUser(tampered);
    expect(result.user.role).toBe("CUSTOMER");
  });
});

describe("loginUser", () => {
  it("returns a session for correct credentials", async () => {
    await registerUser(INPUT);
    const result = await loginUser({ email: INPUT.email, password: INPUT.password });
    expect(result.user.email).toBe(INPUT.email);
    await expect(validateSessionToken(result.token)).resolves.not.toBeNull();
  });

  it("uses one uniform error for unknown email and wrong password", async () => {
    await registerUser(INPUT);

    const wrongPassword = await loginUser({ email: INPUT.email, password: "wrong password" })
      .then(() => null)
      .catch((e: AppError) => e);
    const unknownEmail = await loginUser({ email: "nobody@example.com", password: "whatever1" })
      .then(() => null)
      .catch((e: AppError) => e);

    expect(wrongPassword?.code).toBe("UNAUTHORIZED");
    expect(unknownEmail?.code).toBe("UNAUTHORIZED");
    expect(wrongPassword?.message).toBe(unknownEmail?.message);
  });
});

describe("sessions", () => {
  it("treats an unknown token as null", async () => {
    await expect(validateSessionToken("made-up-token")).resolves.toBeNull();
  });

  it("deletes an expired session on validation", async () => {
    const { user } = await registerUser(INPUT);
    const { token } = await createSession(user.id);
    await prisma.session.update({
      where: { tokenHash: hashSessionToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(validateSessionToken(token)).resolves.toBeNull();
    await expect(
      prisma.session.findUnique({ where: { tokenHash: hashSessionToken(token) } }),
    ).resolves.toBeNull();
  });

  it("slides the expiry forward when less than half the lifetime remains", async () => {
    const { user } = await registerUser(INPUT);
    const { token } = await createSession(user.id);
    const soon = new Date(Date.now() + SESSION_DURATION_MS / 4);
    await prisma.session.update({
      where: { tokenHash: hashSessionToken(token) },
      data: { expiresAt: soon },
    });

    const validated = await validateSessionToken(token);
    expect(validated).not.toBeNull();
    expect(validated!.expiresAt.getTime()).toBeGreaterThan(soon.getTime());
  });

  it("stores only the token hash, never the raw token", async () => {
    const { user } = await registerUser(INPUT);
    const { token } = await createSession(user.id);
    const rows = await prisma.session.findMany();
    expect(rows.some((r) => r.tokenHash === token)).toBe(false);
    expect(rows.some((r) => r.tokenHash === hashSessionToken(token))).toBe(true);
  });

  it("invalidateSession removes the row (server-side logout)", async () => {
    const { user } = await registerUser(INPUT);
    const { token } = await createSession(user.id);
    await invalidateSession(token);
    await expect(validateSessionToken(token)).resolves.toBeNull();
  });
});
