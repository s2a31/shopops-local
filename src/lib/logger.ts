/**
 * Minimal structured logger: level + message + JSON context on stderr.
 * Deliberately tiny — no external monitoring service is used in this project.
 */
type Level = "info" | "warn" | "error";

function log(level: Level, message: string, context?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...serializeContext(context),
  };
  process.stderr.write(`${JSON.stringify(entry)}\n`);
}

function serializeContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] =
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value;
  }
  return out;
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
