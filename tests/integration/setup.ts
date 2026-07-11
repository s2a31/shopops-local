/**
 * Per-worker setup for integration tests: loads .env.test before any
 * application module reads process.env.
 */
process.loadEnvFile(".env.test");
