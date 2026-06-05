-- Nexon — initial seed data
-- Tables are created by SQLAlchemy on first start; this file adds sample data.
-- Wrapped in a DO block so it only runs when the table is empty.

DO $$
BEGIN
  -- Wait for tables to be created by the app (this runs before app starts, so tables may not exist yet)
  -- The seed data is applied via the app's /v1/ endpoints or alembic migrations.
  -- This file is kept as a placeholder for raw SQL migrations if needed.
  RAISE NOTICE 'Nexon DB initialised.';
END;
$$;
