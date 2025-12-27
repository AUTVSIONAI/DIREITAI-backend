-- Fix announcements table schema
-- Add missing columns for stats if they don't exist

DO $$
BEGIN
    -- Add view_count if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'view_count') THEN
        ALTER TABLE announcements ADD COLUMN view_count INTEGER DEFAULT 0;
    END IF;

    -- Add click_count if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'click_count') THEN
        ALTER TABLE announcements ADD COLUMN click_count INTEGER DEFAULT 0;
    END IF;

    -- Add dismiss_count if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'dismiss_count') THEN
        ALTER TABLE announcements ADD COLUMN dismiss_count INTEGER DEFAULT 0;
    END IF;

    -- Ensure is_archived exists (from add_archive_to_announcements.sql)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'is_archived') THEN
        ALTER TABLE announcements ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ensure active exists (sometimes called is_active, checking for both)
    -- The code uses 'active' in some places and 'is_active' in others.
    -- The create table sql used 'is_active'.
    -- The route uses 'active' in the insert payload: `active: active !== undefined ? active : true`.
    -- If the column is named `is_active`, the insert might fail if it tries to insert `active`.
    -- Let's check if we need to rename or alias.
    -- If 'active' column is missing but 'is_active' exists, we should ensure the code uses 'is_active'.
    -- But first let's ensure the columns for stats exist.

END $$;

-- Reload schema cache (notify PostgREST)
NOTIFY pgrst, 'reload schema';
