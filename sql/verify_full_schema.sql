-- Ensure content_moderation table exists
CREATE TABLE IF NOT EXISTS content_moderation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  author_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  content_type VARCHAR(20) DEFAULT 'text',
  priority VARCHAR(20) DEFAULT 'medium',
  reports_count INT DEFAULT 0,
  moderated_at TIMESTAMPTZ,
  moderator_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ai_template JSONB
);

-- Ensure ai_messages table exists (referenced in contentModeration.js)
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES content_moderation(id), -- Assuming conversation_id links here or to another table
  content TEXT,
  role VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure content_reports table exists
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID,
  content_type VARCHAR(20),
  reporter_id UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure announcements table exists
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  target_audience JSONB DEFAULT '{"type": "all"}',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  priority VARCHAR(20) DEFAULT 'medium',
  action_label TEXT,
  action_url TEXT,
  dismiss_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure announcement_dismissals table exists
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  short_message TEXT,
  icon VARCHAR(50),
  image_url TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  data JSONB,
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN DEFAULT false,
  is_clicked BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure notification_templates table exists
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(20) NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix permissions (grant access to authenticated users if needed, or rely on service_role in backend)
-- For backend, we use service_role usually, but RLS might block if not careful.
-- Enabling RLS and adding policies is good practice.

ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins all access content_moderation" ON content_moderation FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Policy: Users can view announcements
CREATE POLICY "Users view active announcements" ON announcements FOR SELECT TO authenticated USING (active = true);

-- Policy: Users can view their own notifications
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Create RPC functions for counters if they don't exist
CREATE OR REPLACE FUNCTION increment_announcement_view(announcement_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE announcements
  SET view_count = view_count + 1
  WHERE id = announcement_id_input;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_announcement_click(announcement_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE announcements
  SET click_count = click_count + 1
  WHERE id = announcement_id_input;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_announcement_dismiss(announcement_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE announcements
  SET dismiss_count = dismiss_count + 1
  WHERE id = announcement_id_input;
END;
$$ LANGUAGE plpgsql;
