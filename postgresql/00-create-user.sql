-- Create retail_user role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'retail_user') THEN
    CREATE ROLE retail_user WITH LOGIN PASSWORD 'retail_password';
  END IF;
END
$$;

-- Made with Bob
