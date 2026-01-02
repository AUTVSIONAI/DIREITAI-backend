-- Drop existing functions to avoid parameter name conflicts
DROP FUNCTION IF EXISTS increment_announcement_view(uuid);
DROP FUNCTION IF EXISTS increment_announcement_click(uuid);
DROP FUNCTION IF EXISTS increment_announcement_dismiss(uuid);

-- Function to increment announcement views
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

-- Function to increment announcement clicks
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

-- Function to increment announcement dismissals
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

-- Create notification_clicks table if not exists
CREATE TABLE IF NOT EXISTS notification_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now()
);

-- Add RLS policies for notification_clicks
ALTER TABLE notification_clicks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notification_clicks' AND policyname = 'Users can insert their own clicks'
    ) THEN
        CREATE POLICY "Users can insert their own clicks" ON notification_clicks
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notification_clicks' AND policyname = 'Admins can view all clicks'
    ) THEN
        CREATE POLICY "Admins can view all clicks" ON notification_clicks
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
            )
          );
    END IF;
END $$;
