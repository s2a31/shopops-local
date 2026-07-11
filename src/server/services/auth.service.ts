import { Prisma } from "@prisma/client";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, invalidateSession, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

import type { LoginInput, RegisterInput } from "@/features/auth/schemas";

export interface AuthResult {
  user: SessionUser;
  token: string;
  expiresAt: Date;
}

const PUBLIC_USER_SELECT = { id: true, email: true, name: true, role: true } as const;

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  let user: SessionUser;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
      },
      select: PUBLIC_USER_SELECT,
    });
  } catch (error) {
    // Unique-constraint race: two registrations for the same email.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", "An account with this email address already exists.");
    }
    throw error;
  }

  const session = await createSession(user.id);
  return { user, ...session };
}

const INVALID_CREDENTIALS = () =>
  // One uniform message for unknown email and wrong password — no user enumeration.
  new AppError("UNAUTHORIZED", "Invalid email or password.");

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...PUBLIC_USER_SELECT, passwordHash: true },
  });
  if (!user) throw INVALID_CREDENTIALS();

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw INVALID_CREDENTIALS();

  const session = await createSession(user.id);
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...session,
  };
}

export async function logoutSession(token: string): Promise<void> {
  await invalidateSession(token);
}
