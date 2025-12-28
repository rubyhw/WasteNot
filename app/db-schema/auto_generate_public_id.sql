-- Migration: Auto-generate public_id for profiles table
-- This trigger automatically generates a unique public_id when a new profile is inserted

-- Function to generate a unique public_id
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TRIGGER AS $$
DECLARE
  new_public_id TEXT;
  attempts INT := 0;
  max_attempts INT := 10;
BEGIN
  -- Generate a random 6-character uppercase alphanumeric ID
  LOOP
    new_public_id := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    
    -- Check if this public_id already exists
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE public_id = new_public_id
    ) THEN
      -- Unique ID found, assign it
      NEW.public_id := new_public_id;
      EXIT;
    END IF;
    
    -- Increment attempts counter
    attempts := attempts + 1;
    
    -- If we've tried too many times, use a timestamp-based approach
    IF attempts >= max_attempts THEN
      new_public_id := UPPER(SUBSTRING(MD5(NEW.id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) FROM 1 FOR 6));
      -- Final check
      IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE public_id = new_public_id
      ) THEN
        NEW.public_id := new_public_id;
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert
DROP TRIGGER IF EXISTS auto_generate_public_id_trigger ON profiles;
CREATE TRIGGER auto_generate_public_id_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.public_id IS NULL OR NEW.public_id = '')
  EXECUTE FUNCTION generate_public_id();

-- Add comment
COMMENT ON FUNCTION generate_public_id() IS 'Automatically generates a unique public_id for new profiles if not provided';

