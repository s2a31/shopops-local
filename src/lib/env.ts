/**
 * Fail-fast access to required environment variables. Importing this module
 * with a missing variable throws immediately with an actionable message,
 * instead of failing later with a confusing runtime error.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and adjust it if needed.`,
    );
  }
  return value;
}

export const env = {
  get DATABASE_URL(): string {
    return required("DATABASE_URL");
  },
  /** Canonical app origin, e.g. http://localhost:3000. Used for CSRF origin checks. */
  get APP_URL(): string {
    return required("APP_URL");
  },
};
