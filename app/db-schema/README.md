# Database Schema Migrations

This directory contains SQL migration files for the WasteNot database.

## Setup Instructions

### Running Migrations in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of the migration file
4. Click **Run** to execute the migration

### Migration Files

#### `auto_generate_public_id.sql`
Automatically generates a unique `public_id` for new profiles when they are inserted into the `profiles` table.

**What it does:**
- Creates a PostgreSQL function that generates a unique 6-character uppercase alphanumeric ID
- Creates a trigger that runs before insert on the `profiles` table
- Only generates a `public_id` if one is not provided (NULL or empty)
- Ensures uniqueness by checking existing records

**To apply:**
1. Open `auto_generate_public_id.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click Run

**Note:** After running this migration, you can remove the manual `public_id` generation from your application code - the database will handle it automatically.

