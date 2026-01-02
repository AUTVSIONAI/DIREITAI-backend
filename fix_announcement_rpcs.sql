-- Fix Announcement RPCs
-- Drop existing functions to avoid parameter name conflicts
DROP FUNCTION IF EXISTS increment_announcement_view(uuid);
DROP FUNCTION IF EXISTS increment_announcement_click(uuid);
DROP FUNCTION IF EXISTS increment_announcement_dismiss(uuid);

-- Recreate increment_announcement_view
CREATE OR REPLACE FUNCTION increment_announcement_view(announcement_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE announcements
  SET view_count = view_count + 1
  WHERE id = announcement_id_input;
END;
$$;

-- Recreate increment_announcement_click
CREATE OR REPLACE FUNCTION increment_announcement_click(announcement_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE announcements
  SET click_count = click_count + 1
  WHERE id = announcement_id_input;
END;
$$;

-- Recreate increment_announcement_dismiss
CREATE OR REPLACE FUNCTION increment_announcement_dismiss(announcement_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE announcements
  SET dismiss_count = dismiss_count + 1
  WHERE id = announcement_id_input;
END;
$$;

-- Ensure tables exist (idempotent)
CREATE TABLE IF NOT EXISTS announcement_clicks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcement_views (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Ensure RLS is enabled
ALTER TABLE announcement_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- Policies (allow insert for authenticated users)
CREATE POLICY "Users can insert their own clicks" ON announcement_clicks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own views" ON announcement_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dismissals" ON announcement_dismissals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
