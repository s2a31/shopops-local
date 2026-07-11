import { createHash, randomBytes } from "node:crypto";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * DB-backed sessions. The client cookie holds a random 32-byte token; the
 * database stores only its SHA-256 hash, so a leaked database dump contains no
 * usable session credentials. Sessions live 30 days and are renewed (slid
 * forward) whenever less than 15 days remain.
 */

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_RENEWAL_THRESHOLD_MS = SESSION_DURATION_MS / 2;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ValidatedSession {
  user: SessionUser;
  expiresAt: Date;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: { tokenHash: hashSessionToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

/**
 * Validates a raw cookie token. Expired sessions are deleted on sight; invalid,
 * expired, and missing tokens all yield null so callers treat them identically.
 */
export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  let expiresAt = session.expiresAt;
  if (session.expiresAt.getTime() - now < SESSION_RENEWAL_THRESHOLD_MS) {
    expiresAt = new Date(now + SESSION_DURATION_MS);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt } });
  }

  return { user: session.user, expiresAt };
}

/** Server-side logout: the session row is removed, not just the cookie. */
export async function invalidateSession(token: string): Promise<void> {
  await prisma.session
    .delete({ where: { tokenHash: hashSessionToken(token) } })
    .catch(() => undefined);
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
