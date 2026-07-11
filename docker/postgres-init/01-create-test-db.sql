-- Runs once when the Postgres volume is first initialized.
-- The dev database (shopops) is created by POSTGRES_DB; this adds the isolated test database.
CREATE DATABASE shopops_test OWNER shopops;
