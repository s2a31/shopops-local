import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { env } from "@/lib/env";
import { AppError, type ApiErrorBody } from "@/lib/errors";
import { logger } from "@/lib/logger";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF / same-origin protection: every state-changing request must carry an
 * Origin header that exactly matches the configured APP_URL. Browsers always
 * send Origin on cross-site and same-site POST/PUT/PATCH/DELETE, so a missing
 * or different value means the request did not come from this app's pages.
 */
export function verifyOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin !== env.APP_URL) {
    throw new AppError(
      "FORBIDDEN",
      "Request origin is missing or does not match the application origin.",
    );
  }
}

function errorResponse(code: AppError["code"], message: string, details?: unknown): NextResponse {
  const body: ApiErrorBody = {
    error: { code, message, ...(details !== undefined && { details }) },
  };
  return NextResponse.json(body, { status: new AppError(code, message).httpStatus });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", "Request validation failed.", error.flatten());
  }
  logger.error("Unhandled API error", { error });
  return errorResponse("INTERNAL", "Something went wrong. Please try again.");
}

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

/**
 * Wraps a route handler with the two behaviors every endpoint needs:
 * origin verification for all mutating methods (impossible to forget), and
 * mapping of thrown AppError/ZodError values onto the JSON error envelope.
 */
export function apiRoute(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      if (MUTATING_METHODS.has(request.method)) {
        verifyOrigin(request);
      }
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/** Parses and validates a JSON request body; malformed JSON is a validation error. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  return schema.parse(raw);
}
